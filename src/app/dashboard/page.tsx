"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { fetchWithRefresh } from "@/lib/api";
import { validateImageFile } from "@/lib/validation";
import type { CasaResponseDto, CreateCasaDto, UpdateCasaDto } from "@/types/casa.types";

const COP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const EMPTY_FORM = { titulo: "", descripcion: "", precio: "" };
const PAGE_SIZE  = 9;

interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface CasasResponsePayload {
  success: boolean;
  error?: string;
  data: {
    casas: CasaResponseDto[];
    pagination: Pagination;
  };
}

const casasInFlight = new Map<string, Promise<CasasResponsePayload>>();

const fetchCasasPage = async (params: URLSearchParams) => {
  const key = params.toString();
  const existingRequest = casasInFlight.get(key);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const res = await fetchWithRefresh(`/api/casas?${key}`);
    const json = (await res.json()) as CasasResponsePayload;
    if (!res.ok || !json.success) throw new Error(json.error || "Error al cargar");
    return json;
  })();

  casasInFlight.set(key, request);

  try {
    return await request;
  } finally {
    casasInFlight.delete(key);
  }
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, isLoading: isAuthLoading } = useAuth();

  const [casas,      setCasas]      = useState<CasaResponseDto[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading,  setIsLoading]  = useState(true);
  const [search,     setSearch]     = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal crear/editar
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<CasaResponseDto | null>(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [submitting,  setSubmitting]  = useState(false);

  // Imagen
  const [imageFile,      setImageFile]      = useState<File | null>(null);
  const [imagePreview,   setImagePreview]   = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Eliminar / Detalle
  const [deleteTarget, setDeleteTarget] = useState<CasaResponseDto | null>(null);
  const [deleting,     setDeleting]     = useState(false);
  const [detailCasa,   setDetailCasa]   = useState<CasaResponseDto | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthLoading && !user) router.replace("/login");
  }, [user, isAuthLoading, router]);

  // Load casas
  const loadCasas = useCallback(async () => {
    if (isAuthLoading || !user) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        search, page: String(currentPage), limit: String(PAGE_SIZE), order: "desc",
      });
      const json = await fetchCasasPage(params);
      setCasas(json.data.casas);
      setPagination(json.data.pagination);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [isAuthLoading, user, search, currentPage, refreshKey]); // eslint-disable-line

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadCasas(); }, [loadCasas]);

  // Modal helpers
  const openCreate = () => {
    setEditTarget(null); setForm(EMPTY_FORM);
    setImageFile(null);  setImagePreview(null);
    setModalOpen(true);
  };
  const openEdit = (casa: CasaResponseDto) => {
    setEditTarget(casa);
    setForm({ titulo: casa.titulo, descripcion: casa.descripcion, precio: String(casa.precio) });
    setImageFile(null); setImagePreview(casa.imagenUrl || null);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  // Image handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const v = validateImageFile(file);
    if (!v.valid) { toast.error(v.error); e.target.value = ""; return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  const removeImage = () => {
    setImageFile(null); setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const precioNum = parseFloat(form.precio);
    if (form.titulo.trim().length < 3)      { toast.error("Título: mínimo 3 caracteres"); return; }
    if (form.descripcion.trim().length < 10) { toast.error("Descripción: mínimo 10 caracteres"); return; }
    if (isNaN(precioNum) || precioNum <= 0)  { toast.error("Ingresa un precio válido"); return; }

    setSubmitting(true);
    let imagenUrl: string | null = editTarget?.imagenUrl ?? null;

    // 1) Upload image if new file selected
    if (imageFile) {
      setImageUploading(true);
      const fd = new FormData();
      fd.append("file", imageFile);
      const upRes  = await fetchWithRefresh("/api/upload", { method: "POST", body: fd });
      const upJson = await upRes.json();
      setImageUploading(false);
      if (!upRes.ok || !upJson.success) {
        toast.error(upJson.error || "Error al subir imagen");
        setSubmitting(false); return;
      }
      imagenUrl = upJson.data.url;
    }
    if (!imagePreview && !imageFile) imagenUrl = null;

    // 2) Create or update
    try {
      let res: Response;
      if (editTarget) {
        const dto: UpdateCasaDto = { titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), precio: precioNum, imagenUrl };
        res  = await fetchWithRefresh(`/api/casas/${editTarget.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dto) });
      } else {
        const dto: CreateCasaDto = { titulo: form.titulo.trim(), descripcion: form.descripcion.trim(), precio: precioNum, imagenUrl };
        res  = await fetchWithRefresh("/api/casas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dto) });
      }
      const json: { success: boolean; error?: string; errors?: { message: string }[] } = await res.json();
      if (!res.ok || !json.success) {
        if (json.errors) json.errors.forEach((e) => toast.error(e.message));
        else toast.error(json.error || "Error al guardar");
        return;
      }
      toast.success(editTarget ? "Casa actualizada ✅" : "Casa publicada ✅");
      closeModal();
      setRefreshKey((k) => k + 1);
    } catch { toast.error("Error de red"); }
    finally { setSubmitting(false); }
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res  = await fetchWithRefresh(`/api/casas/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error(json.error || "Error al eliminar"); return; }
      toast.success("Casa eliminada");
      setDeleteTarget(null);
      setRefreshKey((k) => k + 1);
    } catch { toast.error("Error de red"); }
    finally { setDeleting(false); }
  };

  const canEdit = (casa: CasaResponseDto) => user?.role === "ADMIN" || user?.id === casa.userId;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🏠</span>
          <span className="font-bold text-gray-900 text-lg">CasaHub</span>
          <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${user?.role === "ADMIN" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"}`}>
            {user?.role}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 hidden sm:block">👤 {user?.name}</span>
          <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">Cerrar sesión</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Publicaciones de Casas</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pagination ? `${pagination.total} propiedad${pagination.total !== 1 ? "es" : ""} en total` : "Cargando..."}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text" placeholder="🔍 Buscar..." value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-64"
            />
            <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1">
              <span className="text-base">+</span> Nueva Casa
            </button>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : casas.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
            <span className="text-6xl block mb-4">🏡</span>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{search ? "Sin resultados" : "No hay casas publicadas"}</h3>
            <p className="text-gray-500 text-sm mb-6">{search ? `Sin resultados para "${search}"` : "¡Publica la primera propiedad!"}</p>
            {!search && <button onClick={openCreate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">+ Publicar casa</button>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {casas.map((casa) => (
                <div key={casa.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                  <div className="h-48 bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center cursor-pointer relative overflow-hidden" onClick={() => setDetailCasa(casa)}>
                    {casa.imagenUrl ? <img src={casa.imagenUrl} alt={casa.titulo} className="w-full h-full object-cover" /> : <span className="text-5xl opacity-30">🏠</span>}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 cursor-pointer hover:text-emerald-700" onClick={() => setDetailCasa(casa)}>{casa.titulo}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{casa.descripcion}</p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-emerald-700 font-bold text-base">{COP(casa.precio)}</span>
                      <span className="text-xs text-gray-400">👤 {casa.agente}</span>
                    </div>
                    {canEdit(casa) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => openEdit(casa)} className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">✏️ Editar</button>
                        <button onClick={() => setDeleteTarget(casa)} className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">🗑️ Eliminar</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${p === currentPage ? "bg-emerald-600 text-white" : "border border-gray-300 hover:bg-gray-50"}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={!pagination.hasNextPage}
                  className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editTarget ? "✏️ Editar Casa" : "🏠 Nueva Casa"}</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Casa moderna en El Poblado" maxLength={150} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                <p className="text-xs text-gray-400 mt-1">{form.titulo.length}/150</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Describe la propiedad..." rows={4} maxLength={5000} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none" />
                <p className="text-xs text-gray-400 mt-1">{form.descripcion.length}/5000</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Precio (COP) *</label>
                <input type="number" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="350000000" min={1} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                {form.precio && !isNaN(parseFloat(form.precio)) && parseFloat(form.precio) > 0 && (
                  <p className="text-xs text-emerald-600 mt-1 font-medium">{COP(parseFloat(form.precio))}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de la propiedad</label>
                {imagePreview ? (
                  <div className="relative mb-3 rounded-xl overflow-hidden border border-gray-200">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button type="button" onClick={removeImage} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm hover:bg-red-600 transition-colors shadow">×</button>
                    {imageFile && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">📋 Preview local — aún no guardado</div>}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition-colors mb-3" onClick={() => fileInputRef.current?.click()}>
                    <span className="text-3xl block mb-2">📷</span>
                    <p className="text-sm text-gray-500">Haz clic para seleccionar imagen</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · Máx. 5MB</p>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="hidden" />
                {!imagePreview && <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Seleccionar imagen</button>}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
                <button type="submit" disabled={submitting || imageUploading} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                  {imageUploading ? "Subiendo imagen..." : submitting ? "Guardando..." : editTarget ? "Guardar cambios" : "Publicar casa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Eliminar */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center">
            <span className="text-4xl block mb-3">🗑️</span>
            <h3 className="text-lg font-bold text-gray-900">¿Eliminar esta casa?</h3>
            <p className="text-sm text-gray-500 mt-2 mb-5"><span className="font-medium text-gray-700">{deleteTarget.titulo}</span> será eliminada permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">{deleting ? "Eliminando..." : "Sí, eliminar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {detailCasa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDetailCasa(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {detailCasa.imagenUrl && <img src={detailCasa.imagenUrl} alt={detailCasa.titulo} className="w-full h-56 object-cover rounded-t-2xl" />}
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-900">{detailCasa.titulo}</h2>
                <button onClick={() => setDetailCasa(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-2">&times;</button>
              </div>
              <p className="text-2xl font-bold text-emerald-700 mb-4">{COP(detailCasa.precio)}</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">{detailCasa.descripcion}</p>
              <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-gray-100 pt-4">
                <span>👤 {detailCasa.agente}</span>
                <span>📅 {new Date(detailCasa.createdAt).toLocaleDateString("es-CO")}</span>
              </div>
              {canEdit(detailCasa) && (
                <div className="flex gap-2 mt-4">
                  <button onClick={() => { setDetailCasa(null); openEdit(detailCasa); }} className="flex-1 px-3 py-2 text-sm font-medium bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">✏️ Editar</button>
                  <button onClick={() => { setDetailCasa(null); setDeleteTarget(detailCasa); }} className="flex-1 px-3 py-2 text-sm font-medium bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors">🗑️ Eliminar</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
