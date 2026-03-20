import{c as a,j as e}from"./index-B_en50FV.js";/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=a("AlertTriangle",[["path",{d:"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z",key:"c3ski4"}],["path",{d:"M12 9v4",key:"juzpu7"}],["path",{d:"M12 17h.01",key:"p32p05"}]]);/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=a("Pencil",[["path",{d:"M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z",key:"5qss01"}],["path",{d:"m15 5 4 4",key:"1mk7zo"}]]);/**
 * @license lucide-react v0.309.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const o=a("Trash2",[["path",{d:"M3 6h18",key:"d0wm0j"}],["path",{d:"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6",key:"4alrt4"}],["path",{d:"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2",key:"v07s0e"}],["line",{x1:"10",x2:"10",y1:"11",y2:"17",key:"1uufr5"}],["line",{x1:"14",x2:"14",y1:"11",y2:"17",key:"xtxkd"}]]);function h({open:t,title:r,message:l,confirmText:d="Confirmar",danger:s=!0,onConfirm:i,onCancel:n}){return t?e.jsx("div",{className:"modal-overlay",style:{zIndex:60},children:e.jsxs("div",{className:"modal-box max-w-sm p-6",children:[e.jsxs("div",{className:"flex items-start gap-4 mb-5",children:[e.jsx("div",{className:`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s?"bg-red-100 dark:bg-red-900/40":"bg-indigo-100 dark:bg-indigo-900/40"}`,children:e.jsx(c,{size:20,className:s?"text-red-600 dark:text-red-400":"text-indigo-600 dark:text-indigo-400"})}),e.jsxs("div",{children:[e.jsx("h3",{className:"font-semibold text-gray-900 dark:text-white",children:r}),e.jsx("p",{className:"text-sm text-muted mt-1",children:l})]})]}),e.jsxs("div",{className:"flex gap-3",children:[e.jsx("button",{onClick:n,className:"btn-secondary flex-1",children:"Cancelar"}),e.jsx("button",{onClick:i,className:`flex-1 ${s?"btn-danger":"btn-primary"}`,children:d})]})]})}):null}export{h as C,m as P,o as T};
