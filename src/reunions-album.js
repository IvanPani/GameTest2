import { playerData } from './player-data.js';
import { getReunionPage } from './reunions.js';
import { HistoricalSockCache } from './sock-skin.js';

const textStyle={fontFamily:'Fredoka, sans-serif',fontStyle:'bold',color:'#4c3029'};

export function createReunionsAlbum(scene, panel, personalSheet) {
    const sheet=scene.add.container(6,6);
    panel.addAt(sheet,panel.getIndex(personalSheet));
    const paper=scene.add.rectangle(200,375,326,408,0xffedcf).setStrokeStyle(1.5,0xc69b70);
    sheet.add(paper);
    // Paper grain/rules remain separate from photographs and interactive controls.
    const lines=scene.add.graphics().lineStyle(1,0xc9a575,0.16);
    for(let y=188;y<574;y+=13) lines.lineBetween(46,y,354,y);
    sheet.add(lines);
    const title=scene.add.text(200,210,'REUNITED!',{...textStyle,fontSize:'24px'}).setOrigin(.5);
    sheet.add(title);
    sheet.add(scene.add.text(200,237,'LITTLE PAIRS. BIG ADVENTURES.',{...textStyle,fontSize:'10px',color:'#927252'}).setOrigin(.5));
    const cache=new HistoricalSockCache(scene);
    const album={sheet,cache,section:'bests',page:0,turning:false,photos:[],pageData:getReunionPage([])};
    const label=(parent,x,y,text,size=12)=>{
        const object=scene.add.text(x,y,text,{...textStyle,fontSize:`${size}px`,align:'center'}).setOrigin(.5);
        parent.add(object);return object;
    };
    const control=(parent,x,y,text,action,size=12)=>{
        const button=scene.add.text(x,y,text,{...textStyle,fontSize:`${size}px`,backgroundColor:'#f2d59f',
            padding:{x:9,y:5}}).setOrigin(.5).setInteractive({useHandCursor:true});
        parent.add(button);
        scene.registerMenuControl('records',button,()=>{
            if(scene.location!=='records'||scene.transitioning||scene.starting||album.turning||button.pageEnabled===false)return;
            action();
        });
        return button;
    };
    const empty=label(sheet,200,352,'No reunion photos yet.\nSomeone’s still waiting\nat the bottom…',17);
    empty.setLineSpacing(9);
    const pageInfo=label(sheet,200,526,'',11);
    const previous=control(sheet,64,526,'‹',()=>render(album.page-1),21);
    const next=control(sheet,336,526,'›',()=>render(album.page+1),21);
    const back=control(sheet,200,551,'← PERSONAL BESTS',()=>turn(false),12);
    const pageTurn=control(personalSheet,200,536,'REUNIONS →',()=>turn(true),13);
    album.pageTurn=pageTurn;album.back=back;album.previous=previous;album.next=next;
    const sync=()=>{
        const showing=album.section==='album'&&!album.turning;
        pageTurn.pageEnabled=album.section==='bests'&&!album.turning;
        back.pageEnabled=showing;
        previous.pageEnabled=showing&&album.page>0;
        next.pageEnabled=showing&&album.page<album.pageData.pageCount-1;
        previous.setAlpha(album.page>0?1:.35);
        next.setAlpha(album.page<album.pageData.pageCount-1?1:.35);
        scene.refreshControls();
    };
    const clearPhotos=()=>{
        for(const photo of album.photos) photo.destroy();
        album.photos=[];
    };
    function render(requestedPage) {
        const data=getReunionPage(playerData.getProfile().reunions,requestedPage);
        album.page=data.page;album.pageData=data;
        // Destroy consumers before releasing textures used by the previous page.
        clearPhotos();cache.retain(data.entries.map(entry=>entry.style));
        empty.setVisible(data.total===0);
        pageInfo.setText(`${data.page+1}/${data.pageCount}  •  ${data.total} REUNION${data.total===1?'':'S'}`);
        for(const [index,entry] of data.entries.entries()) {
            const photo=scene.add.container(118+(index%2)*164,316+Math.floor(index/2)*131);
            photo.setAngle([-3,3,2,-3][index]);
            sheet.add(photo);album.photos.push(photo);
            photo.add(scene.add.rectangle(2,3,132,124,0x4a3428,.2));
            photo.add(scene.add.rectangle(0,0,132,124,0xfffcf2).setStrokeStyle(1,0xd6c8af));
            photo.add(scene.add.rectangle(0,-8,112,84,[0xd6e3dd,0xe8d8d3,0xd9dfed,0xe7dfc8][index]));
            const key=cache.get(entry.style);
            for(const [x,mirrored] of [[-22,false],[22,true]]) {
                photo.add(scene.add.image(x,-8,key).setOrigin(.61,.5).setScale(.15).setAngle(180).setFlipX(mirrored));
            }
            photo.add(scene.add.text(0,48,`REUNION #${entry.number}`,{...textStyle,fontSize:'12px'}).setOrigin(.5));
            const tape=scene.add.rectangle(0,-61,42,13,[0xe8b9a4,0xc1d3ad,0xd9c0de,0xe9cc8f][index],.88).setAngle(index%2?7:-6);
            photo.add(tape);
            photo.add(scene.add.text(0,-62,'· · · ·',{...textStyle,fontSize:'10px',color:'#a38265'}).setOrigin(.5).setAngle(index%2?7:-6));
        }
        sync();
    }
    function turn(open) {
        if(album.turning)return;
        album.turning=true;
        if(open)render(album.page);
        else personalSheet.setVisible(true);
        sync();
        scene.tweens.add({targets:personalSheet,x:open?-340:0,alpha:open?0:1,angle:open?-5:0,
            duration:350,ease:'Cubic.easeInOut',onComplete:()=>{
                album.section=open?'album':'bests';album.turning=false;
                personalSheet.setVisible(!open);
                if(!open){clearPhotos();cache.clear();}
                sync();
            }});
        scene.tweens.add({targets:sheet,x:open?0:6,y:open?0:6,duration:350,ease:'Cubic.easeInOut'});
    }
    album.renderPage=render;
    album.open=()=>turn(true);album.close=()=>turn(false);
    scene.events.once('shutdown',()=>{clearPhotos();cache.clear();});
    sync();
    return album;
}
