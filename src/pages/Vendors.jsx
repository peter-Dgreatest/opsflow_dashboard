import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DataTable, Card, KpiCard } from '../components/ui';
import { Topbar } from '../components/layout';
import { Modal, Input, Textarea, FormRow, FormActions } from '../components/modals/Modal';
import { fmtDate } from '../utils/format';
import { vendorsApi } from '../api/endpoints';
import { Plus, Truck, Briefcase, Star, Pencil, Trash2 } from 'lucide-react';

const normalize = d => d?.data || d || [];
const EMPTY = { vendorName:'', phone:'', email:'', vendorSpecialities:'', vendorSummary:'' };

function VendorForm({ initial=EMPTY, onSubmit, onClose, loading }) {
  const [form, setForm] = useState({...EMPTY,...initial});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handle=(e)=>{ e.preventDefault(); if(!form.vendorName) return toast.error('Name required'); onSubmit(form); };
  return (
    <form onSubmit={handle}>
      <Input label="Vendor Name" required value={form.vendorName} onChange={e=>set('vendorName',e.target.value)} placeholder="e.g. ProSound Nigeria" />
      <FormRow>
        <Input label="Phone" value={form.phone||''} onChange={e=>set('phone',e.target.value)} />
        <Input label="Email" type="email" value={form.email||''} onChange={e=>set('email',e.target.value)} />
      </FormRow>
      <Input label="Specialities" value={form.vendorSpecialities||''} onChange={e=>set('vendorSpecialities',e.target.value)} placeholder="e.g. Audio, LED Screens, Transport" />
      <Textarea label="Summary" value={form.vendorSummary||''} rows={2} onChange={e=>set('vendorSummary',e.target.value)} placeholder="Brief description…" />
      <FormActions onClose={onClose} loading={loading} />
    </form>
  );
}

export default function VendorsPage() {
  const qc = useQueryClient();
  const [modal, setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: vendors=[], isLoading } = useQuery({ queryKey:['vendors'], queryFn:vendorsApi.list, select:normalize });

  const createMut = useMutation({ mutationFn:vendorsApi.create, onSuccess:()=>{qc.invalidateQueries(['vendors']);toast.success('Vendor added');setModal(null);}, onError:e=>toast.error(e.message) });
  const updateMut = useMutation({ mutationFn:({id,data})=>vendorsApi.update(id,data), onSuccess:()=>{qc.invalidateQueries(['vendors']);toast.success('Updated');setModal(null);}, onError:e=>toast.error(e.message) });
  const deleteMut = useMutation({ mutationFn:vendorsApi.delete, onSuccess:()=>{qc.invalidateQueries(['vendors']);toast.success('Deleted');setDeleting(null);}, onError:e=>toast.error(e.message) });

  const COLS = [
    { label:'Vendor', accessor:'vendorName', sortable:true,
      render:r=>(
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-pink-400/10 flex items-center justify-center text-pink-400 text-xs font-bold shrink-0">{r.vendorName?.slice(0,2).toUpperCase()}</div>
          <div><p className="font-medium text-xs">{r.vendorName}</p><p className="text-[10px] text-muted">{r.vendorSpecialities}</p></div>
        </div>
      )
    },
    { label:'Phone',  accessor:'phone', render:r=>r.phone||'—' },
    { label:'Email',  accessor:'email', render:r=>r.email||'—' },
    { label:'Added',  accessor:'dateAdded', sortable:true, render:r=>fmtDate(r.dateAdded||r.createdAt) },
    { label:'', render:r=>(
      <div className="flex gap-1.5">
        <button onClick={()=>{setEditing(r);setModal('edit');}} className="w-6 h-6 rounded bg-white/5 text-muted hover:text-text flex items-center justify-center cursor-pointer"><Pencil size={11}/></button>
        <button onClick={()=>setDeleting(r)} className="w-6 h-6 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"><Trash2 size={11}/></button>
      </div>
    )},
  ];

  return (
    <>
      <Topbar title="Vendors" subtitle="Third-party service providers"
        actions={<button onClick={()=>setModal('create')} className="btn-primary flex items-center gap-1.5"><Plus size={13}/>Add Vendor</button>} />
      <div className="flex-1 overflow-y-auto p-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <KpiCard label="Total Vendors" value={vendors.length} accent="pink"   icon={Truck} />
          <KpiCard label="Active"        value={vendors.length} accent="green"  icon={Briefcase} />
          <KpiCard label="With Email"    value={vendors.filter(v=>v.email).length} accent="sky" icon={Star} />
          <KpiCard label="With Phone"    value={vendors.filter(v=>v.phone).length} accent="violet" icon={Truck} />
        </div>
        <Card title="All Vendors" subtitle={`${vendors.length} suppliers`}>
          {isLoading ? <div className="py-16 text-center text-muted text-xs">Loading…</div> : <DataTable columns={COLS} data={vendors} pageSize={10} />}
        </Card>
      </div>
      <Modal title="Add Vendor" open={modal==='create'} onClose={()=>setModal(null)}>
        <VendorForm loading={createMut.isPending} onClose={()=>setModal(null)} onSubmit={d=>createMut.mutate(d)} />
      </Modal>
      <Modal title="Edit Vendor" open={modal==='edit'} onClose={()=>{setModal(null);setEditing(null);}}>
        {editing && <VendorForm initial={editing} loading={updateMut.isPending} onClose={()=>{setModal(null);setEditing(null);}} onSubmit={d=>updateMut.mutate({id:editing.vendorId,data:d})} />}
      </Modal>
      <Modal title="Delete Vendor" open={!!deleting} onClose={()=>setDeleting(null)} width="max-w-sm">
        <p className="text-sm text-muted mb-4">Delete <span className="font-medium text-text">"{deleting?.vendorName}"</span>?</p>
        <div className="flex justify-end gap-2">
          <button onClick={()=>setDeleting(null)} className="btn-ghost text-xs px-4 py-2">Cancel</button>
          <button onClick={()=>deleteMut.mutate(deleting.vendorId)} className="text-xs px-4 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-400 cursor-pointer">Delete</button>
        </div>
      </Modal>
    </>
  );
}
