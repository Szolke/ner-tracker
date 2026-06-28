import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const STATUS_COLORS = { active:'#f59e0b', investigation:'#ef4444', closed:'#10b981', appeal:'#8b5cf6' };
const STATUS_LABELS = { active:'Aktív', investigation:'Nyomozás', closed:'Lezárult', appeal:'Fellebbezés' };
const mrd = huf => (huf/1e9).toLocaleString('hu-HU',{minimumFractionDigits:1,maximumFractionDigits:1})+' Mrd HUF';

export default function EmbedCard() {
  const { id } = useParams();
  const [c, setC] = useState(null);

  useEffect(()=>{
    fetch('/data/news.json').then(r=>r.json()).then(d=>{
      setC(d.cases.find(x=>x.id===id));
    });
  },[id]);

  if (!c) return <div style={{padding:16,fontFamily:'sans-serif',color:'#6b7280'}}>Betöltés...</div>;

  return (
    <div style={{
      fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',
      background:'#1f2937', color:'white',
      borderRadius:12, padding:20, maxWidth:480,
      borderLeft:`4px solid ${STATUS_COLORS[c.status]}`,
      boxShadow:'0 4px 24px rgba(0,0,0,0.3)'
    }}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:11,color:'#9ca3af'}}>{c.source} · {c.date}</span>
        <span style={{fontSize:11,fontWeight:700,color:STATUS_COLORS[c.status]}}>{STATUS_LABELS[c.status]}</span>
      </div>
      <p style={{fontWeight:700,fontSize:16,marginBottom:8,lineHeight:1.4}}>{c.title}</p>
      <p style={{fontSize:13,color:'#d1d5db',marginBottom:12,lineHeight:1.5}}>
        {c.description.slice(0,160)}…
      </p>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <span style={{fontSize:11,color:'#9ca3af'}}>Érintett összeg</span>
          <p style={{fontWeight:800,fontSize:18,color:'#ef4444',margin:0}}>{mrd(c.amount_huf)}</p>
        </div>
        <a href={`https://ner-tracker.pages.dev/?case=${c.id}`}
          target="_blank" rel="noopener noreferrer"
          style={{fontSize:12,color:'#3b82f6',textDecoration:'none',
            padding:'6px 12px',border:'1px solid #3b82f6',borderRadius:6}}>
          NER Tracker →
        </a>
      </div>
    </div>
  );
}
