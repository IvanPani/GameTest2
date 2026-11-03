import test from 'node:test';
import assert from 'node:assert/strict';
import { PlayerData, defaultProfile } from '../src/player-data.js';
import { validateReunions, snapshotReunionStyle, getReunionPage } from '../src/reunions.js';

function fixture(initial=defaultProfile()) {
    let stored=JSON.stringify(initial),id=0,now=1700000000000;
    const storage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
    return {open:()=>new PlayerData(()=>storage,()=>`album-run-${++id}`,()=>now+=1000),raw:()=>JSON.parse(stored)};
}
const pink={bodyColor:'#ed81b1',accentColor:'#e34b4b',patternId:'crescents',patternColor:'#ffffff',toesEnabled:true,cuffEnabled:false};
const green={bodyColor:'#208741',accentColor:'#182c60',patternId:'stars',patternColor:'#f3cf4b',toesEnabled:false,cuffEnabled:true};

test('successful runs save one dated photo using the run-start outfit, even after customization changes',()=>{
    const f=fixture(),p=f.open();p.load();p.selectStyle(pink);
    const run=p.beginRun();p.selectStyle(green);
    assert.equal(p.completeRun(run,250,{completed:true,totalButtons:10}),true);
    const photo=p.getProfile().reunions[0];
    assert.deepEqual(photo,{id:run,number:1,completedAt:1700000001000,style:pink});
    assert.deepEqual(p.getProfile().sockStyle,green);
    assert.equal(p.getProfile().activeRunStyle,null);
    assert.equal(p.getProfile().currency,250);
    assert.equal(p.getProfile().records.completedRuns,1);
    assert.equal(p.getProfile().records.totalButtons,10);
    assert.equal(p.completeRun(run,250,{completed:true}),false);
    assert.equal(f.open().load().reunions.length,1);
    assert.equal(f.open().load().currency,250);
});

test('deaths, abandoned runs, and non-boolean completion flags never add photos',()=>{
    const p=fixture().open();
    p.completeRun(p.beginRun(),10,{completed:false});
    p.completeRun(p.beginRun(),10,{completed:'true'});
    const abandoned=p.beginRun();p.beginRun();
    assert.equal(p.completeRun(abandoned,100,{completed:true}),false);
    assert.deepEqual(p.getProfile().reunions,[]);
    assert.equal(p.getProfile().records.totalRuns,2);
    assert.equal(p.getProfile().currency,20);
});

test('run snapshot and independent historical styles persist across game restarts',()=>{
    const f=fixture();let p=f.open();p.selectStyle(pink);const first=p.beginRun();
    p=f.open();p.load();p.selectStyle(green);p.completeRun(first,100,{completed:true});
    p.completeRun(p.beginRun(),200,{completed:true});
    const history=f.open().load().reunions;
    assert.deepEqual(history.map(entry=>entry.style),[pink,green]);
    history[0].style.bodyColor='#000000';
    p.selectStyle({bodyColor:'#ffffff',patternId:'squares'});
    assert.deepEqual(f.open().load().reunions[0].style,pink);
    assert.deepEqual(f.open().load().reunions[1].style,green);
    assert.equal(f.open().load().records.completedRuns,2);
    assert.equal(f.open().load().currency,300);
});

test('legacy records, currency, upgrades and cosmetics survive without invented photographs',()=>{
    const old=defaultProfile();delete old.reunions;delete old.activeRunStyle;
    old.records.completedRuns=8;old.records.totalRuns=20;old.currency=12345;
    old.upgrades={fabric:2,steering:3};old.sockStyle={...pink};old.unlocks.cosmetics=['ribbon'];
    const p=fixture(old).open();const loaded=p.load();
    assert.deepEqual(loaded.reunions,[]);assert.equal(loaded.records.completedRuns,8);
    assert.equal(loaded.currency,12345);assert.deepEqual(loaded.upgrades,old.upgrades);
    assert.deepEqual(loaded.unlocks.cosmetics,['ribbon']);assert.deepEqual(loaded.sockStyle,pink);
    p.completeRun(p.beginRun(),100,{completed:true});
    assert.equal(p.getProfile().reunions.length,1);assert.equal(p.getProfile().reunions[0].number,9);
});

test('corrupt/incomplete entries are skipped individually and IDs/numbers are deduplicated',()=>{
    const valid={id:'valid',number:1,completedAt:1700000000000,style:pink};
    const entries=[null,{},valid,valid,{...valid,id:'same-number'},
        {...valid,id:'bad-date',number:2,completedAt:Infinity},
        {...valid,id:'bad-style',number:3,style:{...pink,bodyColor:'pink'}},
        {...valid,id:'missing-toggle',number:4,style:{bodyColor:'#ffffff'}},
        {...valid,id:'unknown-pattern',number:5,style:{...pink,patternId:'not-real'}},
        {...valid,id:'second',number:6,style:green}];
    assert.deepEqual(validateReunions(entries).map(entry=>entry.id),['valid','second']);
    assert.deepEqual(validateReunions('broken'),[]);
    const old=defaultProfile();old.currency=4321;old.reunions=entries;
    const loaded=fixture(old).open().load();assert.equal(loaded.currency,4321);assert.equal(loaded.reunions.length,2);
    assert.equal(snapshotReunionStyle({...pink,toesEnabled:'off'}),null);
});

test('the album paginates four photos per sheet, clamps navigation and has a real empty state',()=>{
    const entries=Array.from({length:101},(_,i)=>({number:i+1}));
    assert.deepEqual(getReunionPage(entries,0).entries.map(e=>e.number),[1,2,3,4]);
    assert.deepEqual(getReunionPage(entries,1).entries.map(e=>e.number),[5,6,7,8]);
    assert.deepEqual(getReunionPage(entries,999),{page:25,pageCount:26,total:101,entries:[{number:101}]});
    assert.equal(getReunionPage(entries,-1).page,0);
    assert.deepEqual(getReunionPage([]),{page:0,pageCount:1,total:0,entries:[]});
});
