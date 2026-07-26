import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../services/api";
import { useApi } from "../../hooks/useApi";
import { LoadingSpinner } from "../../components/StateComponents";
import { showError } from "../../utils/Toast";
import { useRef } from "react";

export default function CustomerProfile() {
  const { id } = useParams();


  // =========================
  // ADD FORM STATE
  // =========================
  const [form, setForm] = useState({
    type: "credit",
    amount: "",
    note: ""
  });

  // EDIT CUSTOMER STATE
  const [customerForm, setCustomerForm] = useState({ name: '', phone: '', note: '' });
  const { loading: avatarLoading, execute: executeAvatar } = useApi();
  const fileRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  // =========================
  // EDIT STATE
  // =========================
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({
    type: "",
    amount: "",
    note: ""
  });

  // =========================
  // LOAD DATA
  // =========================
  const { data, loading, error, execute: fetchCustomerData } = useApi();
  const { execute: performAction } = useApi();

  const loadData = useCallback(() => {
    fetchCustomerData(() => API.get(`/business/customers/${id}`));
  }, [id, fetchCustomerData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (data) {
      setCustomerForm({ name: data.name || '', phone: data.phone || '', note: data.note || '' });
      setAvatarPreview(data.avatar ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}${data.avatar}` : null);
    }
  }, [data]);


  // =========================
  // ADD TRANSACTION
  // =========================
  /* eslint-disable-next-line no-unused-vars */
  const addTransaction = async () => {
    if (!form.amount) return toast.error("Amount is required");

    const payload = {
      customer_id: id,
      ...form,
      amount: parseFloat(form.amount) || 0
    };
    
    const result = await performAction(API.post("/business/transactions", payload), {
      toastMessages: { loading: 'Adding...', success: 'Transaction Added!', error: 'Failed to add.' }
    });
    
    if (result) {
      setForm({ type: "credit", amount: "", note: "" });
      loadData();
    }
  };

  // =========================
  // UPDATE CUSTOMER DETAILS
  // =========================
  const saveCustomer = async () => {
    if (!customerForm.name || !customerForm.name.trim()) return toast.error('Name is required');
    const payload = { name: customerForm.name.trim(), phone: customerForm.phone.trim() || null, note: customerForm.note.trim() || null };
    const result = await performAction(() => API.put(`/business/customers/${id}`, payload), { toastMessages: { loading: 'Saving...', success: 'Customer updated', error: 'Update failed' } });
    if (result) loadData();
  };

  const downloadStatement = async (days = 30) => {
    const loadingToast = toast.loading('Preparing statement...');
    try {
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = new Date().toISOString().split('T')[0];

      const response = await API.get(`/business/reports/customer-statement`, {
        params: { customer_id: id, start_date: start, end_date: end, format: 'pdf' },
        responseType: 'blob'
      });

      const disposition = response.headers['content-disposition'] || '';
      let filename = `customer-statement-${id}.pdf`;
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) filename = match[1];

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      toast.dismiss(loadingToast);
      toast.success('Statement downloaded');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to download statement');
      console.error('Download statement failed', err);
    }
  };

  const printStatement = async (days = 30) => {
    const loadingToast = toast.loading('Preparing statement for print...');
    try {
      const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const end = new Date().toISOString().split('T')[0];
      const response = await API.get(`/business/reports/customer-statement`, {
        params: { customer_id: id, start_date: start, end_date: end, format: 'pdf' },
        responseType: 'blob'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      toast.dismiss(loadingToast);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error('Failed to prepare statement for print');
      console.error('Print statement failed', err);
    }
  };

  const handleAvatarClick = () => {
    if (avatarLoading) return;
    fileRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showError('File too large (5MB max)'); return; }
    const localPreview = URL.createObjectURL(file);
    setAvatarPreview(localPreview);

    const formData = new FormData();
    formData.append('avatar', file);

    await executeAvatar(() => API.post(`/business/customers/${id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }), {
      loadingMessage: 'Uploading avatar...',
      successMessage: 'Avatar uploaded!',
      onSuccess: () => loadData(),
      onError: () => setAvatarPreview(data?.avatar ? `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000'}${data.avatar}` : null)
    });
  };

  const deleteAvatar = async () => {
    const ok = window.confirm('Remove customer avatar?');
    if (!ok) return;

    const result = await performAction(() => API.delete(`/business/customers/${id}/avatar`), {
      toastMessages: { loading: 'Removing avatar...', success: 'Avatar removed', error: 'Failed to remove avatar.' }
    });

    if (result) {
      loadData();
    }
  };

  // =========================
  // START EDIT
  // =========================
  const startEdit = (t) => {
    setEditId(t.id);
    setEditForm({
      type: t.type,
      amount: t.amount,
      note: t.note || ""
    });
  };

  // =========================
  // SAVE EDIT
  // =========================
  const saveEdit = async () => {
    if (!editForm.amount) return toast.error("Amount is required");

    const payload = {
      ...editForm,
      amount: parseFloat(editForm.amount) || 0
    };

    const result = await performAction(API.put(`/business/transactions/${editId}`, payload), {
      toastMessages: { loading: 'Saving...', success: 'Transaction Updated!', error: 'Update failed.' }
    });
    
    if (result) {
      setEditId(null);
      loadData();
    }
  };

  // =========================
  // DELETE TRANSACTION
  // =========================
  const deleteTransaction = async (tid) => {
    const ok = window.confirm("Are you sure you want to delete this transaction?");
    if (!ok) return;

    const result = await performAction(API.delete(`/business/transactions/${tid}`), {
      toastMessages: { loading: 'Deleting...', success: 'Transaction Deleted!', error: 'Delete failed.' }
    });

    if (result) {
      loadData();
    }
  };

  // =========================
  // LOADING / EMPTY STATE
  // =========================
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;
  if (!data) return <p>No customer data found</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex gap-6 items-start mb-6">
        <div className="w-28">
          <div className="avatar-wrapper cursor-pointer" onClick={handleAvatarClick}>
            <img src={avatarPreview || '/default-avatar.png'} alt="Customer Avatar" className="rounded-full w-28 h-28 object-cover" />
            <div className="avatar-overlay text-sm text-white bg-black/40 p-1 rounded">{avatarLoading ? <LoadingSpinner size="small" /> : 'Change'}</div>
          </div>
          <input type="file" ref={fileRef} onChange={handleAvatarChange} accept="image/*" style={{ display: 'none' }} />
          <div className="mt-2">
            <button onClick={deleteAvatar} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded">Remove</button>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-2xl font-semibold">{data.name}</h2>
          <p className="text-sm text-gray-500">{data.phone}</p>
          <div className="mt-3">
            <label className="block text-sm text-gray-600">Name</label>
            <input className="w-full p-2 border rounded" value={customerForm.name} onChange={(e)=>setCustomerForm(prev=>({...prev, name: e.target.value}))} />
            <label className="block text-sm text-gray-600 mt-2">Phone</label>
            <input className="w-full p-2 border rounded" value={customerForm.phone} onChange={(e)=>setCustomerForm(prev=>({...prev, phone: e.target.value}))} />
            <label className="block text-sm text-gray-600 mt-2">Note</label>
            <textarea className="w-full p-2 border rounded" value={customerForm.note} onChange={(e)=>setCustomerForm(prev=>({...prev, note: e.target.value}))} />
            <div className="mt-3">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded" onClick={saveCustomer}>Save</button>
                  <div className="inline-block ml-3">
                    <button onClick={() => downloadStatement(30)} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Download 30d</button>
                    <button onClick={() => printStatement(30)} className="ml-2 px-3 py-2 bg-gray-200 rounded text-sm">Print</button>
                  </div>
            </div>
          </div>
        </div>
      </div>

      <hr className="my-4" />

      {/* TRANSACTIONS */}
      <h3 className="text-lg font-semibold mb-3">📜 Transaction History</h3>

      {(data.transactions || []).length === 0 ? (
        <p>No transactions</p>
      ) : (
        (data.transactions || []).map((t) => (
          <div key={t.id} className="p-3 border-b">
            {editId !== t.id ? (
              <>
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{t.type === 'credit' ? 'Credit' : 'Debit'} • ₹{t.amount}</div>
                    <div className="text-sm text-gray-500">{t.note}</div>
                    <small className="text-xs text-gray-400">{t.created_at}</small>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(t)} className="px-2 py-1 bg-blue-500 text-white rounded text-sm">Edit</button>
                    <button onClick={() => deleteTransaction(t.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">Delete</button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-2">
                  <select value={editForm.type} onChange={(e)=>setEditForm(prev=>({...prev, type: e.target.value}))}>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                  </select>
                  <input type="number" value={editForm.amount} onChange={(e)=>setEditForm(prev=>({...prev, amount: e.target.value}))} />
                  <input value={editForm.note} onChange={(e)=>setEditForm(prev=>({...prev, note: e.target.value}))} />
                  <button onClick={saveEdit} className="px-2 py-1 bg-green-500 text-white rounded">Save</button>
                  <button onClick={()=>{setEditId(null); setEditForm({type:'', amount:'', note:''})}} className="px-2 py-1 bg-gray-200 rounded">Cancel</button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}