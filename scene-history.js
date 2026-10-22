// Local, bounded scene editing history. Does not affect saved library entries.
export class SceneHistory {
  constructor(limit=50){this.limit=limit;this.entries=[];this.position=-1;}
  reset(snapshot){this.entries=[snapshot];this.position=0;}
  record(snapshot){
    if(this.entries[this.position]===snapshot)return false;
    this.entries=this.entries.slice(0,this.position+1);
    this.entries.push(snapshot);
    if(this.entries.length>this.limit)this.entries.shift();
    this.position=this.entries.length-1;
    return true;
  }
  get canUndo(){return this.position>0;}
  get canRedo(){return this.position>=0&&this.position<this.entries.length-1;}
  undo(){return this.canUndo?this.entries[--this.position]:null;}
  redo(){return this.canRedo?this.entries[++this.position]:null;}
}
