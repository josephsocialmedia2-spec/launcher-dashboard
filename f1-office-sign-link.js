(()=>{'use strict';
function inject(){if(document.getElementById('officeSignsNav'))return;const side=document.querySelector('.sidebar');if(!side)return;const a=document.createElement('a');a.id='officeSignsNav';a.className='side-item';a.href='cartelli-ufficio.html';a.innerHTML='<span style="font-size:16px">📷</span><span>Cartelli da lavorare</span>';const anchor=side.querySelector('a[href="crm.html"]')||side.querySelector('.active-secondary');if(anchor)anchor.insertAdjacentElement('afterend',a);else side.appendChild(a)}
function boot(){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(inject,250),{once:true});else setTimeout(inject,250)}
addEventListener('f1:dashboard-auth-ready',()=>setTimeout(inject,80));boot();
})();
