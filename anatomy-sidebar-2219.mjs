/* AnatomIQ Studio 2.2.19: one anatomical taxonomy, two complementary surfaces.
   This builds the interactive sidebar from the same 2.2.18 tree as breadcrumbs.
   No chapter/mesh settings are mutated until a teacher requests View only. */
import {buildAnatomyTree,anatomyPath} from './anatomy-divisions-2218.mjs';

const compare=(a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'});
const systemOrder=['Skeletal','Muscular','Connective','Cardiovascular','Respiratory','Digestive','Nervous','Urinary','Lymphatic','Endocrine','Integumentary','Reproductive'];
export function orderedNodes(node){
  return [...node.children.values()].sort((a,b)=>{
    if(!node.path.length){
      const ai=systemOrder.indexOf(a.label),bi=systemOrder.indexOf(b.label);
      if(ai>=0&&bi>=0)return ai-bi;
      if(ai>=0)return -1;if(bi>=0)return 1;
    }
    return compare(a.label,b.label);
  });
}
export function pathIncludes(parent,child){return parent.every((name,i)=>child[i]===name);}
export function sidebarOpenDefault(node,selectedPath,scopePath,searching){
  if(searching)return true;
  if(node.path.length===1)return true;
  if(selectedPath.length&&pathIncludes(node.path,selectedPath))return true;
  if(scopePath.length&&pathIncludes(node.path,scopePath))return true;
  return false;
}
export function renderAnatomySidebar(parent,entries,{
  createItem,onView,expanded,selected=null,activePath=[],searching=false,document:doc=globalThis.document
}){
  const tree=buildAnatomyTree(entries);
  const selectedPath=selected?anatomyPath(selected):[];
  // DOM is constructed into a fragment; the caller swaps the whole list only once.
  const fragment=doc.createDocumentFragment();
  function appendNode(node,container){
    if(!node.children.size){
      // Real structures are leaves: no redundant C7 > C7 submenu.
      for(const item of node.entries)container.append(createItem(item));
      return;
    }
    const detail=doc.createElement('details');
    detail.className='anat-nav-node';
    const key='anat-tree:'+node.path.join('/');
    detail.open=searching ? true : (expanded.get(key) ?? sidebarOpenDefault(node,selectedPath,activePath,searching));
    detail.addEventListener('toggle',()=>expanded.set(key,detail.open));
    const summary=doc.createElement('summary');
    const label=doc.createElement('span');label.className='anat-nav-node-label';label.textContent=node.label;
    const count=doc.createElement('span');count.className='anat-nav-node-count';count.textContent=String(node.entries.length);
    summary.append(label,count);
    if(node.path.length){
      const view=doc.createElement('button');view.type='button';view.className='anat-nav-view';
      view.textContent='View';view.title=`Show only ${node.label} in the 3D viewer`;
      view.setAttribute('aria-label',`Show only ${node.label}`);
      if(activePath.length&&node.path.length===activePath.length&&pathIncludes(node.path,activePath)){
        view.classList.add('active');view.setAttribute('aria-current','location');
      }
      view.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();onView(node.path);});
      summary.append(view);
    }
    detail.append(summary);
    const branch=doc.createElement('div');branch.className='anat-nav-children';
    for(const child of orderedNodes(node))appendNode(child,branch);
    detail.append(branch);container.append(detail);
  }
  for(const node of orderedNodes(tree))appendNode(node,fragment);
  parent.append(fragment);
  return tree;
}
