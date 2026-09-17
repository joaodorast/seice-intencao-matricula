import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Depois de cada deploy, os arquivos com código dividido (PDF, Excel, o
// painel admin) trocam de nome. Quem já estava com o site aberto antes do
// deploy tenta buscar um arquivo que não existe mais e o clique não faz
// nada, silenciosamente. O Vite avisa isso com o evento "vite:preloadError"
// — a correção é só recarregar a página uma vez para pegar a versão nova.
// Chegar até aqui prova que o pacote atual carregou certinho, então libera
// a trava de uma futura tentativa (de um próximo deploy).
sessionStorage.removeItem('seice_reload_apos_deploy')
window.addEventListener('vite:preloadError', () => {
  const jaTentou = sessionStorage.getItem('seice_reload_apos_deploy')
  if (jaTentou) return
  sessionStorage.setItem('seice_reload_apos_deploy', '1')
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
