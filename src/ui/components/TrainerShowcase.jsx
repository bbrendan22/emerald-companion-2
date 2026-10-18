import {publicAsset} from '../../assets/publicAsset.js';
import React, {useEffect, useRef, useState} from 'react';
import {changeShowcaseSlot, showcaseSlots} from '../../storage/trainerShowcase.js';
import ShowcaseEditor from './ShowcaseEditor.jsx';
import ShowcaseArtwork from './ShowcaseArtwork.jsx';

export default function TrainerShowcase({trainer, records, showcase, children}) {
  const artwork = trainer.gender === 'male' ? 'brendan' : trainer.gender === 'female' ? 'may' : null;
  const slots = showcaseSlots(showcase.slots, records);
  const [editing, setEditing] = useState(null);
  const lastTap = useRef(null);
  const pointer = useRef(null);
  const trigger = useRef(null);
  const keyboardEdit = useRef(false);
  function open(index, element, keyboard = false) {keyboardEdit.current = keyboard; lastTap.current = null; trigger.current = element; setEditing(index);}
  useEffect(() => {if(editing === null && trigger.current) {if(!keyboardEdit.current) trigger.current.setAttribute('data-pointer-focus', ''); trigger.current.focus();}}, [editing]);
  function close() {setEditing(null);}
  return <>
    <section className="trainer-top" aria-label="Trainer overview">
      <div className="trainer-artwork-card"><div className="trainer-artwork-heading"><h2>{trainer.name || 'Trainer'}</h2><img className={`trainer-champion ${trainer.isChampion ? '' : 'ribbon-unearned'}`} src={publicAsset('/ribbons/champion-ribbon.png')} width="36" height="36" alt={trainer.isChampion ? 'Pokémon League Champion' : 'Championship not completed'} title={trainer.isChampion ? 'Pokémon League Champion' : 'Championship not completed'} /></div>{artwork ? <img className="trainer-fullbody" src={publicAsset(`/trainers/${artwork}.png`)} alt={artwork === 'brendan' ? 'Trainer Brendan' : 'Trainer May'} /> : <span>Trainer artwork unavailable</span>}</div>
      {children}
    </section>
    <section className="trainer-showcase trainer-team-card" aria-label="Showcase team"><h2>Showcase</h2><div className="trainer-team-grid" role="group" aria-label="Showcase team. Double-tap occupied slots to edit; tap empty slots to add.">
        {slots.map((pokemon,index) => <button type="button" className="trainer-team-slot" key={index}
          aria-label={`Showcase slot ${index+1}${pokemon ? ', occupied. Double-tap to edit' : ', empty. Add Pokémon'}`} aria-haspopup="dialog"
          onBlur={event => event.currentTarget.removeAttribute('data-pointer-focus')}
          onKeyDown={event => {event.currentTarget.removeAttribute('data-pointer-focus'); if(event.key === 'Enter' || event.key === ' ') {event.preventDefault(); if(!event.repeat) open(index,event.currentTarget,true);}}}
          onPointerDown={event => {event.currentTarget.setAttribute('data-pointer-focus', ''); pointer.current = {type:event.pointerType,time:performance.now()};}}
          onPointerCancel={() => {lastTap.current=null; pointer.current=null;}}
          onClick={event => {
            if(!pokemon) {open(index,event.currentTarget); return;}
            if(pointer.current?.type === 'touch') {
              const now = performance.now(), previous = lastTap.current;
              if(now-pointer.current.time > 500) {lastTap.current=null; return;}
              if(previous && previous.index === index && now-previous.time < 350 && Math.hypot(event.clientX-previous.x,event.clientY-previous.y)<24) open(index,event.currentTarget);
              else lastTap.current = {index,time:now,x:event.clientX,y:event.clientY};
            } else if(event.detail === 0) open(index,event.currentTarget,true);
          }}
          onDoubleClick={event => {event.preventDefault(); if(pokemon && pointer.current?.type !== 'touch') open(index,event.currentTarget);}}>
          {pokemon ? <ShowcaseArtwork pokemon={pokemon} /> : <span aria-hidden="true">+</span>}
        </button>)}
      </div>
    </section>
    {showcase.error && <p className="trainer-warnings" role="alert">{showcase.error}</p>}
    {editing !== null && <ShowcaseEditor key={editing} slot={slots[editing]} onClose={close} onSave={value => showcase.save(changeShowcaseSlot(showcase.slots,editing,value))} />}
  </>;
}
