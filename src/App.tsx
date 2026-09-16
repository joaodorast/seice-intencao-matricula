import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import PreMatriculaPage from "./pages/PreMatriculaPage";
import { Spinner } from "./components/ui";

// O painel (e as bibliotecas de Excel/PDF) só é baixado por quem abre /admin,
// deixando o site das famílias bem mais leve.
const AdminPage = lazy(() => import("./pages/AdminPage"));

function PainelAdmin() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner label="Carregando painel..." />
        </div>
      }
    >
      <AdminPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PreMatriculaPage />} />
        {/* painel geral (as duas unidades) */}
        <Route path="/admin" element={<PainelAdmin />} />
        {/* painel de uma unidade: /admin/campos-eliseos e /admin/jardim-primavera */}
        <Route path="/admin/:unidadeSlug" element={<PainelAdmin />} />
      </Routes>
    </BrowserRouter>
  );
}
