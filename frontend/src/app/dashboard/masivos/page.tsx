'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ImagePlus, MessageSquare, Send, Users, X } from 'lucide-react';
import { apiPath } from '@/lib/api-url';
import { getAuthHeaders } from '@/utils/auth';

type Recipient = { id: string; nombreComercial?: string; razonSocial?: string; telefono?: string; ciudad?: string; vendedor?: { nombre?: string } };
type Template = { id: string; nombre: string; cuerpo: string };
const VARIABLES = ['nombre', 'empresa', 'telefono', 'ciudad', 'producto', 'precio', 'vendedor'];

export default function MasivosPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [message, setMessage] = useState('Hola {{nombre}}, te saluda el equipo comercial de XPANDEZ. Tenemos una promoción especial para ti.');
  const [imageUrl, setImageUrl] = useState('');
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [customersRes, templatesRes] = await Promise.all([
          fetch(apiPath('/customers?limit=100'), { headers: getAuthHeaders(), cache: 'no-store' }),
          fetch(apiPath('/campaigns/templates'), { headers: getAuthHeaders(), cache: 'no-store' }),
        ]);
        if (customersRes.ok) {
          const data = await customersRes.json();
          setRecipients(data.items || data.data || (Array.isArray(data) ? data : []));
        }
        if (templatesRes.ok) {
          const data = await templatesRes.json();
          setTemplates(Array.isArray(data) ? data : data.items || data.data || []);
        }
      } catch {
        setNotice('No se pudieron cargar los destinatarios.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const visibleRecipients = useMemo(() => {
    const term = filter.toLowerCase();
    return recipients.filter((r) => {
      const text = [r.nombreComercial, r.razonSocial, r.telefono, r.ciudad].filter(Boolean).join(' ').toLowerCase();
      return !term || text.includes(term);
    });
  }, [recipients, filter]);

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const chooseTemplate = (id: string) => {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (template) setMessage(template.cuerpo);
  };
  const addVariable = (variable: string) => setMessage((current) => current + (current.endsWith(' ') ? '' : ' ') + '{{' + variable + '}}');
  const handleImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ''));
    reader.readAsDataURL(file);
  };
  const saveAsTemplate = async () => {
    const nombre = window.prompt('Nombre de la plantilla');
    if (!nombre?.trim()) return;
    const res = await fetch(apiPath('/campaigns/templates'), { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ nombre: nombre.trim(), categoria: 'MASIVOS', cuerpo: message }) });
    setNotice(res.ok ? 'Plantilla guardada correctamente.' : 'No se pudo guardar la plantilla.');
  };
  const send = () => {
    if (!selected.length || !message.trim()) return setNotice('Selecciona al menos un destinatario y escribe un mensaje.');
    setNotice('Destinatarios listos para envío. Revisa el mensaje antes de iniciar la campaña.');
  };

  return (
    <main className="min-h-screen bg-background p-6 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-primary">WhatsApp</p><h1 className="text-3xl font-bold">Masivos</h1><p className="mt-1 text-muted-foreground">Envío manual por WhatsApp con mensajes personalizados. No usa Zernio ni chatbot.</p></div>
          <Link href="/dashboard/masivos/plantillas" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">Gestionar plantillas</Link>
        </header>
        {notice && <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">{notice}</div>}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,.9fr)]">
          <div className="space-y-5 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><MessageSquare size={18} /> Plantilla del mensaje</h2><button type="button" onClick={saveAsTemplate} className="text-sm font-semibold text-primary hover:underline">Guardar plantilla</button></div>
            <div className="flex gap-2"><select value={templateId} onChange={(e) => chooseTemplate(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"><option value="">Mensaje personalizado</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.nombre}</option>)}</select><button type="button" className="whitespace-nowrap rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted">Generar con IA</button></div>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className="w-full rounded-lg border border-border bg-background p-3 text-sm" />
            <div className="flex flex-wrap gap-2">{VARIABLES.map((variable) => <button key={variable} type="button" onClick={() => addVariable(variable)} className="rounded-md bg-muted px-2 py-1 font-mono text-xs hover:bg-muted/70">{'{{' + variable + '}}'}</button>)}</div>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:bg-muted/40"><ImagePlus size={18} /><span>{imageUrl ? 'Cambiar imagen' : 'Subir imagen opcional'}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} /></label>
            {imageUrl && <div className="relative overflow-hidden rounded-lg border border-border"><img src={imageUrl} alt="Vista previa" className="max-h-56 w-full object-contain" /><button type="button" onClick={() => setImageUrl('')} className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white" aria-label="Quitar imagen"><X size={14} /></button></div>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5"><h2 className="mb-4 text-lg font-semibold">Vista previa</h2><div className="rounded-xl bg-emerald-50 p-4 text-sm text-slate-800">{message.replace('{{nombre}}', 'María López').replace('{{empresa}}', 'Importadora Andina SRL').replace('{{producto}}', 'Producto destacado').replace('{{precio}}', 'a coordinar')}</div>{imageUrl && <img src={imageUrl} alt="Vista previa de la promoción" className="mt-3 max-h-48 w-full rounded-xl object-contain" />}<button type="button" onClick={send} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90"><Send size={17} /> Preparar envío ({selected.length})</button></div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="flex items-center gap-2 text-lg font-semibold"><Users size={18} /> Destinatarios</h2><p className="text-sm text-muted-foreground">{selected.length} seleccionados</p></div><input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar por nombre, empresa o teléfono" className="rounded-lg border border-border bg-background px-3 py-2 text-sm md:w-80" /></div>
          <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b border-border text-xs uppercase text-muted-foreground"><th className="w-10 p-3"></th><th className="p-3">Nombre</th><th className="p-3">Empresa</th><th className="p-3">Teléfono</th><th className="p-3">Ciudad</th><th className="p-3">Vendedor</th><th className="p-3">WhatsApp</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Cargando destinatarios...</td></tr> : visibleRecipients.map((recipient) => { const name = recipient.nombreComercial || recipient.razonSocial || 'Sin nombre'; const checked = selected.includes(recipient.id); return <tr key={recipient.id} className="border-b border-border/60 hover:bg-muted/30"><td className="p-3"><input type="checkbox" checked={checked} onChange={() => toggle(recipient.id)} /></td><td className="p-3 font-semibold">{name}</td><td className="p-3">{recipient.razonSocial || '-'}</td><td className="p-3">{recipient.telefono || 'Sin teléfono'}</td><td className="p-3">{recipient.ciudad || '-'}</td><td className="p-3">{recipient.vendedor?.nombre || 'Admin'}</td><td className="p-3">{recipient.telefono ? 'Disponible' : 'Sin teléfono'}</td></tr>; })}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}

