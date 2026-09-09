"use client";
import { ReactNode, useEffect, useRef } from 'react';
import s from './patients.module.css';
export default function Modal({title,subtitle,children,onClose,busy=false,wide=false}: {title:string;subtitle?:string;children:ReactNode;onClose:()=>void;busy?:boolean;wide?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const el=ref.current!; const trigger=document.activeElement as HTMLElement|null; const overflow=document.body.style.overflow;
    el.showModal(); document.body.style.overflow='hidden';
    return()=>{el.close();document.body.style.overflow=overflow;trigger?.focus();};
  },[]);
  return <dialog ref={ref} className={`${s.modal} ${wide?s.wide:''}`} aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><header className={s.modalHeader}><div>{subtitle&&<p>{subtitle}</p>}<h2>{title}</h2></div><button type="button" autoFocus disabled={busy} onClick={onClose} aria-label="Fechar janela">×</button></header><div className={s.modalBody}>{children}</div></dialog>;
}
