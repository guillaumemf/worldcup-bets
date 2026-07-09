export const metadata = {
  title: "Le full stack vous répond",
};

export default function FullStackPage() {
  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center">
      {/* Photo en plein écran */}
      <img
        src="/fullstack.jpg"
        alt="Le full stack vous répond"
        className="max-h-[85vh] max-w-full object-contain"
      />

      {/* Légende */}
      <p className="mt-6 px-4 text-center text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
        Voilà ce qu&apos;il vous dit le full stack
      </p>
    </div>
  );
}
