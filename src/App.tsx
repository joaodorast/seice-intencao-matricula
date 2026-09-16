import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PreMatriculaPage from "./pages/PreMatriculaPage";
import { Spinner } from "./components/ui";
import { UNIDADES } from "./config";
import type { Unidade } from "./types";

// O painel (e as bibliotecas de Excel/PDF) só é baixado por quem abre uma
// rota de admin, deixando o site das famílias bem mais leve.
const AdminPage = lazy(() => import("./pages/AdminPage"));

function PainelAdmin({ unidade }: { unidade?: Unidade }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner label="Carregando painel..." />
        </div>
      }
    >
      <AdminPage unidade={unidade} />
    </Suspense>
  );
}

const CAMPOS_ELISEOS = UNIDADES.find((u) => u.slug === "campos-eliseos")!;
const JARDIM_PRIMAVERA = UNIDADES.find((u) => u.slug === "jardim-primavera")!;

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreMatriculaPage />} />
        {/* painel geral: vê as duas unidades juntas */}
        <Route path="/admin" element={<PainelAdmin />} />
        {/* dois dashboards próprios, cada um na sua rota — não vivem sob /admin */}
        <Route path="/seice-ce" element={<PainelAdmin unidade={CAMPOS_ELISEOS} />} />
        <Route path="/seice-jp" element={<PainelAdmin unidade={JARDIM_PRIMAVERA} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
