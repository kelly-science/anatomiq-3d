/* AnatomIQ 2.2.18 | Data-backed, non-destructive anatomical division navigation.
   Every loaded mesh belongs to one path; unrecognized names stay discoverable. */
import {skeletalDivision} from './skeletal-views-2217.mjs';
import {isBaseConnective} from './connective-model.js'; // ANATOMIQ_COSTAL_CARTILAGE_TAXONOMY_20261025
export const SYSTEM_LABELS={skeletal:'Skeletal',connective:'Connective',muscular:'Muscular',cardiovascular:'Cardiovascular',respiratory:'Respiratory',digestive:'Digestive',nervous:'Nervous',urinary:'Urinary',lymphatic:'Lymphatic',endocrine:'Endocrine',integumentary:'Integumentary',reproductive:'Reproductive'};
const has=(n,re)=>re.test(n);
const tidy=s=>String(s||'').trim().replace(/\s+/g,' ');
const lc=s=>tidy(s).toLowerCase();
const H=(re,yes,no)=>has(no,re)?yes:undefined;
function vertebralID(n){
  const lower=lc(n).replace(/[–—_]/g,' ');
  if(/\batlas\b/.test(lower))return 'C1';if(/\baxis\b/.test(lower))return 'C2';
  const explicit=lower.match(/\b([ctl])\s*[- ]?\s*(1[0-2]|[1-9])\b/i);
  if(explicit){const prefix=explicit[1].toUpperCase(),num=Number(explicit[2]);if(num<=(prefix==='T'?12:prefix==='C'?7:5))return prefix+num;}
  const number=lower.match(/\b(cervical|thoracic|lumbar)\s+vertebra(?:e)?\s*(?:no\.?\s*)?(1[0-2]|[1-9])\b/i)
    ||lower.match(/\b(1[0-2]|[1-9])(?:st|nd|rd|th)?\s+(cervical|thoracic|lumbar)\s+vertebra\b/i);
  if(number){const area=isNaN(+number[1])?number[1]:number[2],i=Number(isNaN(+number[1])?number[2]:number[1]);const prefix={cervical:'C',thoracic:'T',lumbar:'L'}[area];if(prefix&&i<=(prefix==='C'?7:prefix==='T'?12:5))return prefix+i;}
  return null;
}
function skeletalParts(s,n){
 const axial=skeletalDivision(s)==='axial';
 if(axial){
  if(has(n,/\b(vertebra|vertebral|atlas|axis|sacrum|sacral|coccyx|coccygeal|c[1-7]|t(?:1[0-2]|[1-9])|l[1-5])\b/)){
    const v=vertebralID(n);
    const segment=v?.startsWith('C')||has(n,/cervical|atlas|axis/)?'Cervical Vertebrae':v?.startsWith('T')||has(n,/thoracic vertebra/)?'Thoracic Vertebrae':v?.startsWith('L')||has(n,/lumbar/)?'Lumbar Vertebrae':has(n,/sacrum|sacral/)?'Sacrum':'Coccyx';
    return ['Axial',segment,v||tidy(s.name)];
  }
  if(has(n,/\b(rib|ribs|sternum|manubrium|xiphoid|costae)\b/))return ['Axial','Thoracic Cage',has(n,/sternum|manubrium|xiphoid/)?'Sternum':'Ribs',tidy(s.name)];
  if(has(n,/hyoid/))return ['Axial','Hyoid',tidy(s.name)];
  if(has(n,/malleus|incus|stapes|ossicle/))return ['Axial','Auditory Ossicles',tidy(s.name)];
  if(s.skull||s.tissue==='tooth'||has(n,/skull|cranium|mandible|maxilla|zygomatic|occipital bone/)){
    const division=s.tissue==='tooth'||has(n,/tooth|teeth|incisor|molar|canine/)?'Dentition':has(n,/frontal bone|parietal bone|temporal bone|occipital bone|sphenoid|ethmoid/)?'Cranial Bones':'Facial Bones';
    return ['Axial','Skull',division,tidy(s.name)];
  }
  return ['Axial','Other Axial Structures',tidy(s.name)];
 }
 if(has(n,/clavicle|scapula|acromion|coracoid/))return ['Appendicular','Pectoral Girdle',tidy(s.name)];
 if(has(n,/humerus/))return ['Appendicular','Upper Limb','Arm',tidy(s.name)];
 if(has(n,/radius|ulna\b/))return ['Appendicular','Upper Limb','Forearm',tidy(s.name)];
 if(has(n,/carpal|metacarp|hand|pisiform|scaphoid|lunate|triquetrum|trapezium|trapezoid|capitate|hamate/))return ['Appendicular','Upper Limb','Hand',tidy(s.name)];
 if(has(n,/pelvis|pelvic|hip bone|ilium|iliac|ischium|ischial|pubis|pubic|innominate/))return ['Appendicular','Pelvic Girdle',tidy(s.name)];
 if(has(n,/femur|patella/))return ['Appendicular','Lower Limb','Thigh & Knee',tidy(s.name)];
 if(has(n,/tibia|fibula/))return ['Appendicular','Lower Limb','Leg',tidy(s.name)];
 if(has(n,/tarsal|metatars|calcaneus|talus|navicular|cuboid|cuneiform|foot|heel/))return ['Appendicular','Lower Limb','Foot',tidy(s.name)];
 if(has(n,/phalanx|phalanges/))return ['Appendicular',has(n,/toe|foot|pedal/)?'Lower Limb':'Upper Limb',has(n,/toe|foot|pedal/)?'Foot':'Hand',tidy(s.name)];
 return ['Appendicular','Other Appendicular Structures',tidy(s.name)];
}
function muscularParts(s,n){
 const upper=has(n,/deltoid|biceps brachii|triceps brachii|brachialis|brachioradialis|pronator|supinator|carpi|digitorum|pollicis|thenar|hypothenar|interossei.*hand|rotator cuff|supraspinatus|infraspinatus|teres major|teres minor|subscapularis/);
 const lower=has(n,/glute|piriformis|iliopsoas|psoas|sartorius|quadriceps|rectus femoris|vastus|adductor|gracilis|semitendinosus|semimembranosus|biceps femoris|gastrocnemius|soleus|tibialis|fibularis|peroneus|popliteus|hallucis|plantar|hamstring/);
 if(upper)return ['Appendicular Muscles',has(n,/deltoid|supraspinatus|infraspinatus|teres|subscapularis/)?'Shoulder':has(n,/biceps brachii|triceps brachii|brachialis/)?'Arm':has(n,/thenar|hypothenar|interossei.*hand/)?'Hand':'Forearm',tidy(s.name)];
 if(lower)return ['Appendicular Muscles',has(n,/glute|piriformis|iliopsoas|psoas/)?'Hip':has(n,/femoris|vastus|adductor|gracilis|sartorius|hamstring|semitendinosus|semimembranosus/)?'Thigh':has(n,/hallucis|plantar/)?'Foot':'Leg',tidy(s.name)];
 if(has(n,/masseter|temporalis|orbicularis oculi|orbicularis oris|zygomaticus|frontalis|occipitalis|buccinator|platysma|sternocleidomastoid|scalen|digastric|geniohyoid|mylohyoid/))return ['Axial Muscles','Head & Neck',tidy(s.name)];
 if(has(n,/pectoralis|serratus|intercostal|diaphragm/))return ['Axial Muscles','Thorax',tidy(s.name)];
 if(has(n,/rectus abdominis|oblique|transversus abdominis|quadratus lumborum/))return ['Axial Muscles','Abdomen',tidy(s.name)];
 if(has(n,/trapezius|latissimus|rhomboid|erector spinae|multifidus|splenius|semispinalis|longissimus|iliocostalis/))return ['Axial Muscles','Back',tidy(s.name)];
 return ['Other Muscles',s.layer==='deep muscles'?'Deep':'Superficial',tidy(s.name)];
}
function connectiveParts(s,n){
 if(has(n,/costal cartilage|rib cartilage/))return ['Cartilage','Costal Cartilages',tidy(s.name)];
 if(has(n,/intervertebral disc|intervertebral disk|disc\b/))return ['Cartilage','Intervertebral Discs',tidy(s.name)];
 if(has(n,/cartilage/))return ['Cartilage','Other Cartilage',tidy(s.name)];
 if(has(n,/retinaculum|retinacula/))return ['Retinacula',has(n,/flexor/)?'Flexor Retinacula':'Other Retinacula',tidy(s.name)];
 if(has(n,/tendon|achilles/))return ['Tendons',tidy(s.name)];
 if(has(n,/ligament/))return ['Ligaments',has(n,/plantar|foot/)?'Foot & Ankle':has(n,/wrist|carpal/)?'Wrist & Hand':'Other Ligaments',tidy(s.name)];
 if(has(n,/interosseous membrane|membrane/))return ['Membranes',has(n,/forearm|radius|ulna/)?'Forearm':has(n,/leg|tibia|fibula/)?'Leg':'Other Membranes',tidy(s.name)];
 if(has(n,/fascia|aponeuros/))return ['Fascia & Aponeuroses',tidy(s.name)];
 return ['Other Connective Tissue',tidy(s.name)];
}
function cardiovascularParts(s,n){
 const grp=lc(s.cardioGroup),organ=lc(s.organId);
 if(grp==='heart-internal'||organ==='heart-internal'||has(n,/atrium|ventricle|mitral|tricuspid|aortic valve|pulmonary valve|papillary|chordae|septum|endocardium/))return ['Heart','Chambers, Valves & Interior',tidy(s.name)];
 if(grp==='heart'||organ==='heart'||has(n,/myocardium|pericardium|heart wall/))return ['Heart','Heart Walls & Coverings',tidy(s.name)];
 if(grp==='coronary'||organ==='coronary'||has(n,/coronary/))return ['Coronary Circulation',has(n,/vein|sinus/)?'Veins':'Arteries',tidy(s.name)];
 if(grp==='pulmonary'||organ==='pulmonary'||has(n,/pulmonary arter|pulmonary vein|pulmonary trunk/))return ['Pulmonary Circulation',has(n,/vein/)?'Veins':'Arteries',tidy(s.name)];
 if(grp==='systemic'||organ==='artery'||organ==='vein'||has(n,/aorta|artery|vein|vena cava/))return ['Systemic Circulation',has(n,/vein|vena cava/)?'Veins':'Arteries',tidy(s.name)];
 return ['Other Cardiovascular Structures',tidy(s.name)];
}
function respiratoryParts(s,n){
 const o=lc(s.organId);
 if(has(n,/nasal|sinus|pharynx|larynx|epiglottis/)||o==='upper'||o==='larynx')return ['Upper Respiratory Tract',has(n,/larynx|epiglottis/)?'Larynx':has(n,/pharynx/)?'Pharynx':'Nose & Nasal Cavity',tidy(s.name)];
 if(has(n,/trachea/)||o==='trachea')return ['Lower Respiratory Tract','Trachea',tidy(s.name)];
 if(has(n,/bronch|bronchiol|airway/)||o==='airway')return ['Lower Respiratory Tract','Bronchi & Bronchioles',tidy(s.name)];
 if(has(n,/lung|lobe|alveol|pulmonary segment/)||o==='lung')return ['Lower Respiratory Tract','Lungs',tidy(s.name)];
 return ['Other Respiratory Structures',tidy(s.name)];
}
function digestiveParts(s,n){
 const o=lc(s.organId);
 if(has(n,/oral|mouth|tongue|palate|teeth|salivary|parotid|submandibular|sublingual|pharynx/)||has(o,/oral|salivary/))return ['Upper Alimentary Tract','Oral Cavity & Pharynx',tidy(s.name)];
 if(has(n,/esophag/)||o==='esophagus')return ['Upper Alimentary Tract','Esophagus',tidy(s.name)];
 if(has(n,/stomach|pylor|fundus|gastric/)||o==='stomach')return ['Upper Alimentary Tract','Stomach',tidy(s.name)];
 if(has(n,/duoden|jejun|ileum|small intestin/)||has(o,/duodenum|jejunum|ileum/))return ['Intestines','Small Intestine',tidy(s.name)];
 if(has(n,/colon|cecum|caecum|appendix|rectum|anal canal|large intestine|sigmoid/)||has(o,/colon|cecum|appendix|rectum/))return ['Intestines','Large Intestine',tidy(s.name)];
 if(has(n,/liver|hepatic/)||o==='liver')return ['Accessory Digestive Organs','Liver',tidy(s.name)];
 if(has(n,/gallbladder|bile duct|biliary/)||o==='gallbladder')return ['Accessory Digestive Organs','Gallbladder & Bile Ducts',tidy(s.name)];
 if(has(n,/pancrea/)||o==='pancreas')return ['Accessory Digestive Organs','Pancreas',tidy(s.name)];
 if(has(n,/mesenter|peritone|omentum/))return ['Supporting Structures','Peritoneum & Mesentery',tidy(s.name)];
 return ['Other Digestive Structures',tidy(s.name)];
}
function nervousParts(s,n){
 if(has(n,/sclera|cornea|eyeball|retina|iris|pupil|lens|optic/))return ['Special Senses','Eyes & Vision',tidy(s.name)];
 if(has(n,/auditory|vestibul|cochlea|tympanic|inner ear/))return ['Special Senses','Ear & Hearing',tidy(s.name)];
 if(has(n,/cerebell/))return ['Central Nervous System','Brain','Cerebellum',tidy(s.name)];
 if(has(n,/midbrain|pons\b|medulla oblongata|brainstem/))return ['Central Nervous System','Brain','Brainstem',tidy(s.name)];
 if(has(n,/cerebr|frontal lobe|parietal lobe|temporal lobe|occipital lobe|thalam|hypothalam|hippocamp/))return ['Central Nervous System','Brain','Cerebrum & Diencephalon',tidy(s.name)];
 if(has(n,/spinal cord/))return ['Central Nervous System','Spinal Cord',tidy(s.name)];
 if(has(n,/cranial nerve/))return ['Peripheral Nervous System','Cranial Nerves',tidy(s.name)];
 if(has(n,/spinal nerve|plexus|sciatic|median nerve|ulnar nerve|radial nerve|femoral nerve|tibial nerve|peroneal nerve/))return ['Peripheral Nervous System','Spinal & Peripheral Nerves',tidy(s.name)];
 if(has(n,/ganglion|sympathetic|parasympathetic/))return ['Autonomic Nervous System',tidy(s.name)];
 return ['Other Nervous Structures',tidy(s.name)];
}
function urinaryParts(s,n){
 if(has(n,/kidney|renal|nephron|cortex|medulla|calyx|calyces/))return ['Kidneys',tidy(s.name)];
 if(has(n,/ureter/))return ['Urinary Tract','Ureters',tidy(s.name)];
 if(has(n,/bladder|vesical/))return ['Urinary Tract','Urinary Bladder',tidy(s.name)];
 if(has(n,/urethra/))return ['Urinary Tract','Urethra',tidy(s.name)];
 return ['Other Urinary Structures',tidy(s.name)];
}
function lymphaticParts(s,n){
 if(has(n,/thymus|bone marrow/))return ['Primary Lymphoid Organs',tidy(s.name)];
 if(has(n,/spleen|splenic/))return ['Secondary Lymphoid Organs','Spleen',tidy(s.name)];
 if(has(n,/tonsil|peyer/))return ['Secondary Lymphoid Organs','Mucosa-Associated Tissue',tidy(s.name)];
 if(has(n,/lymph node|lymph gland/))return ['Secondary Lymphoid Organs','Lymph Nodes',tidy(s.name)];
 if(has(n,/lymphatic vessel|lymphatic duct|thoracic duct|cisterna chyli/))return ['Lymphatic Vessels & Ducts',tidy(s.name)];
 return ['Other Lymphatic Structures',tidy(s.name)];
}
const DIVIDERS={skeletal:skeletalParts,muscular:muscularParts,connective:connectiveParts,cardiovascular:cardiovascularParts,respiratory:respiratoryParts,digestive:digestiveParts,nervous:nervousParts,urinary:urinaryParts,lymphatic:lymphaticParts};
export function anatomyPath(s){
 const system=(isBaseConnective(s)?'connective':lc(s?.system))||'other';
 const name=lc(s?.name||s?.sourceName||'Unnamed structure');
 const parts=(DIVIDERS[system]||((x)=>['Other Structures',tidy(x.name)]))(s,name);
 return [SYSTEM_LABELS[system]||system[0].toUpperCase()+system.slice(1),...parts];
}
const makeNode=(label,path)=>({label,path,children:new Map(),entries:[]});
export function buildAnatomyTree(entries){
 const root=makeNode('Systems',[]);
 for(const entry of entries||[]){
  const path=anatomyPath(entry);let node=root;node.entries.push(entry);
  for(const label of path){let child=node.children.get(label);if(!child){child=makeNode(label,[...node.path,label]);node.children.set(label,child);}child.entries.push(entry);node=child;}
 }
 return root;
}
export function getDivisionNode(root,path){let node=root;for(const part of path){node=node?.children.get(part);if(!node)return null;}return node;}
export function divisionCoverage(root){return {total:root.entries.length,systems:[...root.children.keys()],unclassified:root.entries.filter(s=>anatomyPath(s).some(x=>/^Other /i.test(x))).length};}
