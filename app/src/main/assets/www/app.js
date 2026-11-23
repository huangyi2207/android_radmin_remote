'use strict';
(() => {
  const pending = new Map(); let serial = 0, toastTimer, currentPage = 'home', searchTimer, searchGeneration = 0;
  const $ = id => document.getElementById(id);
  const native = window.Native;
  function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 6500); }
  function call(method, args = {}) {
    if (!native) return Promise.reject(new Error('请在 Android APK 内打开此界面。浏览器无法连接 VPN。'));
    return new Promise((resolve, reject) => {
      const id = String(++serial);
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('无响应。请检查 VPN 权限和诊断信息。')); }, ['Radmin.connect','Proxy.importFile','Remote.importKey','Remote.chooseFile'].includes(method) ? 300000 : 50000);
      pending.set(id, {resolve, reject, timer});
      native.postMessage(JSON.stringify({id, method, args}));
    });
  }
  if (native) native.onmessage = event => {
    let data; try { data = JSON.parse(event.data); } catch { return; }
    const p = pending.get(data.id); if (!p) return;
    pending.delete(data.id); clearTimeout(p.timer);
    if (data.error) p.reject(new Error(data.error)); else p.resolve(data.result);
  };
  // Asynchronous public API, available only to this bundled document.
  window.Radmin = Object.fromEntries(['connect','disconnect','reconnect','getState','getNetworks','getPeers'].map(m => [m, () => call('Radmin.' + m)]));
  window.Radmin.joinNetwork = (name,password,privateNetwork = true) => call('Radmin.joinNetwork',{name,password,private:privateNetwork});
  window.Radmin.leaveNetwork = id => call('Radmin.leaveNetwork',{id});
  window.Radmin.pingPeer = id => call('Radmin.pingPeer',{id});
  window.Proxy = {getConfig:() => call('Proxy.getConfig'),setConfig:config => call('Proxy.setConfig',config),test:() => call('Proxy.test'),enable:() => call('Proxy.enable'),disable:() => call('Proxy.disable')};
  window.Diagnostics = {getLogs:() => call('Diagnostics.getLogs'),clearLogs:() => call('Diagnostics.clearLogs')};
  async function action(fn) { try { return await fn(); } catch (e) { toast(e.message); } }
  function button(text, fn, cls = 'secondary') { const b = document.createElement('button'); b.textContent = text; b.className = cls; b.onclick = () => action(async () => { b.disabled = true; try { await fn(); } finally { b.disabled = false; } }); return b; }
  function el(tag, text, cls) { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; }
  function empty(container, text) { container.replaceChildren(el('div', text, 'empty')); }
  function bytes(n) { if (n < 1024) return n + ' B'; if (n < 1048576) return (n/1024).toFixed(1) + ' KB'; return (n/1048576).toFixed(1) + ' MB'; }
  function render(s) {
    const busy = ['CONNECTED','CONNECTING','PROVISIONING','DISCONNECTING'].includes(s.phase);
    for (const id of ['saveProxy','importXray','importXrayFile']) $(id).disabled = busy;
    $('proxyForm').elements.mode.disabled = busy; $('xrayProfile').disabled = busy;
    $('xrayState').textContent = `Xray: ${s.xray?.phase || 'STOPPED'}${s.xray?.version ? ' · ' + s.xray.version : ''}${s.xray?.error ? ' · ' + s.xray.error : ''}`;
    $('phase').textContent = s.phase; $('phase').classList.toggle('online', s.phase === 'CONNECTED' && s.vpnReady);
    $('vpnIp').textContent = s.ip || '—';
    $('status').textContent = s.phase === 'CONNECTED' ? (s.vpnReady ? 'VPN 已连接 · TUN 就绪' : 'Control 已连接 · TUN 未就绪：' + (s.interfaceError || '等待中')) : (s.message || s.phase);
    $('transport').textContent = s.transport === 'XRAY_VLESS_REALITY' ? 'VLESS / Reality' : s.transport === 'NONE' ? '—' : s.transport;
    $('proxyStatus').textContent = s.transport === 'XRAY_VLESS_REALITY' ? 'VLESS + Reality · 节点经中继' : s.transport === 'SOCKS5' ? 'SOCKS5 TCP · 节点经中继' : s.transport === 'DIRECT' ? '普通 Android 上行' : '无活动会话';
    $('peerCount').textContent = s.peers.filter(p => p.state === 'CONNECTED').length;
    $('rx').textContent = bytes(s.rx); $('tx').textContent = bytes(s.tx); $('device').textContent = s.nodeName;
    $('activeNetworks').textContent = s.networks.map(n => n.name).join(', ') || '没有已连接的网络';
    const nlist = $('networkList'); nlist.replaceChildren();
    if (!s.networks.length) empty(nlist, '连接后将显示网络列表。');
    for (const n of s.networks) { const card = el('article',''); card.append(el('h3',n.name),el('p',`${n.members} 台设备 · ${n.pendingApproval ? '等待批准' : '网络成员'}`),button('离开',async () => { if (confirm('离开网络 ' + n.name + '?')) await call('Radmin.leaveNetwork',{id:n.id}); },'danger')); nlist.append(card); }
    window.Classroom?.render(s);

  }
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => action(async () => {
    currentPage = b.dataset.page;
    document.querySelectorAll('.page').forEach(p => p.hidden = p.id !== currentPage);
    document.querySelectorAll('[data-page]').forEach(n => { if(n===b)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current'); });
    window.Classroom?.pageChanged(currentPage);
    if (currentPage === 'diagnostics') await diagnostics();
  }));
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => action(async () => { b.disabled = true; try { await call('Radmin.' + b.dataset.action); } finally { b.disabled = false; } }));
  $('joinForm').onsubmit = event => { event.preventDefault(); const f = event.target, data = {name:f.elements.name.value, password:f.elements.password.value,private:f.elements.private.checked}; f.elements.password.value = ''; action(async () => { await call('Radmin.joinNetwork',data); toast('请求已处理。结果见网络列表和诊断。'); }); };
  function publicList(result) {
    const list = $('publicList'); list.replaceChildren(); $('more').hidden = !result.hasMore;
    if (!result.items.length) empty(list,'未找到任何内容。请先连接 VPN。');
    for(const n of result.items) { const row = el('article',''); row.append(el('p',n.name),el('small',`${n.members} 名成员`),button(n.joined ? '已连接' : '加入',() => call('Radmin.joinNetwork',{name:n.name,private:false}))); list.append(row); }
  }
  $('search').oninput = () => { clearTimeout(searchTimer); const gen = ++searchGeneration; searchTimer = setTimeout(() => action(async () => { const result = await call('Radmin.searchPublic',{query:$('search').value}); if(gen===searchGeneration)publicList(result); }),300); };
  $('more').onclick = () => action(async () => publicList(await call('Radmin.loadMorePublic')));
  function modeFields() { const mode = $('proxyForm').elements.mode.value; $('socksFields').hidden = mode !== 'PROXY'; $('xrayFields').hidden = mode !== 'XRAY'; }
  $('proxyForm').elements.mode.onchange = modeFields;
  function profileOptions(profiles, selected) {
    const select = $('xrayProfile'); select.replaceChildren();
    if(!profiles?.length){const option=el('option','请先导入 JSON');option.value='';select.append(option);return;}
    for(const p of profiles){const option=el('option',`${p.network === "grpc" ? "gRPC" : "TCP"} · ${p.name} · ${p.host}:${p.port}`);option.value=p.id;select.append(option);}
    select.value=selected || profiles[0].id;
  }
  async function importProfiles(method, args={}) {
    const result=await call(method,args); if(result.cancelled)return;
    profileOptions(result.profiles,result.profileId);
    $('proxyForm').elements.mode.value='XRAY';modeFields();$('xrayJson').value='';
    $('importResult').textContent=`已导入配置文件：${result.imported}. 已跳过其他条目：${result.skipped}. 选择服务器 → 保存 → 在主页连接。`;
  }
  $('importXray').onclick = () => action(async()=>{const text=$('xrayJson').value; if(!text.trim())throw new Error('请先粘贴 JSON'); if(new TextEncoder().encode(text).length>512*1024)throw new Error('JSON 超过 512 KB'); $('importXray').disabled=true;try{await importProfiles('Proxy.importJson',{text});}finally{$('importXray').disabled=false;} });
  $('importXrayFile').onclick = () => action(async()=>{ $('importXrayFile').disabled=true;try{await importProfiles('Proxy.importFile');}finally{$('importXrayFile').disabled=false;} });
  function proxyArgs() { const f = $('proxyForm').elements, a = {mode:f.mode.value,host:f.host.value,port:Number(f.port.value),username:f.username.value,timeoutMs:Number(f.timeoutMs.value),clearPassword:f.clearPassword.checked,profileId:f.profileId.value}; if(f.password.value)a.password=f.password.value; return a; }
  $('proxyForm').onsubmit = event => { event.preventDefault(); action(async () => { await call('Proxy.setConfig',proxyArgs()); $('proxyForm').elements.password.value=''; $('proxyForm').elements.clearPassword.checked=false; toast('已保存。现在可以连接 VPN。'); }); };
  $('testProxy').onclick = () => action(async () => { const result = await call('Proxy.test',proxyArgs()); if(result.requiresConnect){$('proxyTest').textContent=result.message;return;} if(result.xraySession){$('proxyTest').textContent=`OpenRad 已通过 Xray 连接。Control RTT：${result.latencyMs} 毫秒。现在请检查到电脑的 PING。`;return;} $('proxyTest').textContent = `TCP CONNECT 可用：${result.latencyMs} 毫秒。Radmin 登录需通过连接 VPN 来验证。`; });
  $('settingsForm').onsubmit = event => { event.preventDefault(); const f = event.target.elements; action(async () => { await call('Settings.save',{nodeName:f.nodeName.value,autoReconnect:f.autoReconnect.checked}); toast('设置已保存'); }); };
  async function diagnostics() { $('diag').textContent = JSON.stringify(await call('Diagnostics.get'),null,2); }
  $('copyDiag').onclick = () => action(async () => { await call('Diagnostics.copy'); toast('诊断信息已复制'); });
  $('exportDiag').onclick = () => action(() => call('Diagnostics.export'));
  $('clearLogs').onclick = () => action(async () => { await call('Diagnostics.clearLogs'); await diagnostics(); });
  async function poll() { try { render(await call('Radmin.getState')); if(currentPage==='diagnostics')await diagnostics(); } catch(e) { $('status').textContent=e.message; } finally { setTimeout(poll,1500); } }
  window.ClassroomApi = {call, action, toast};
  async function init() {
    try { const [p,s] = await Promise.all([call('Proxy.getConfig'),call('Settings.get')]);
      const f = $('proxyForm').elements; for(const key of ['mode','host','port','username','timeoutMs'])f[key].value=p[key];
      profileOptions(p.profiles,p.profileId);modeFields();
      f.password.placeholder = p.hasPassword ? '密码已保存；留空表示保留' : '密码未保存';
      $('settingsForm').elements.nodeName.value=s.nodeName; $('settingsForm').elements.autoReconnect.checked=s.autoReconnect;
    } catch(e) { toast(e.message); }
    if(native)poll(); else $('status').textContent='要使用 VPN，请安装 Android APK。本文件仅为应用界面。';
  }
  init();
})();
