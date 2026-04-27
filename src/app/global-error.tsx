"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-100">
        <main className="min-h-screen flex items-center justify-center px-4 py-8">
          <section className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">Ocurrio un error inesperado</h1>
            <p className="mt-2 text-sm text-gray-600">
              La aplicacion encontro un problema global. Puedes reintentar o volver al inicio de sesion.
            </p>

            {process.env.NODE_ENV !== "production" && (
              <p className="mt-3 rounded-md bg-red-50 p-3 text-xs text-red-700 break-words">
                {error.message}
              </p>
            )}

            <div className="mt-5 flex flex-col sm:flex-row gap-2">
              <button
                onClick={reset}
                className="w-full sm:w-auto rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Reintentar
              </button>
              <button
                onClick={() => window.location.replace("/login")}
                className="w-full sm:w-auto rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Ir a Login
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
