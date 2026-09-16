/**
 * Camada decorativa fixa e estática: só uma sombra suave no topo, para dar
 * profundidade ao fundo escuro sem clarear nada ao rolar a página.
 */
export default function BackgroundFX() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/35 to-transparent" />
    </div>
  );
}
