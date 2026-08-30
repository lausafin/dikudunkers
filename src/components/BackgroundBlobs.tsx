export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-orange-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute top-[30%] -right-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-blue-400/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen" />
    </div>
  );
}
