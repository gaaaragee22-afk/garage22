"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Store,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();

  const { login, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password.trim()) {
      setError("Preencha o e-mail e a senha.");
      return;
    }

    try {
      setIsSubmitting(true);

      await login({
        email: normalizedEmail,
        password,
      });
    } catch (error: unknown) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível realizar o login.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle size={32} className="animate-spin text-[#7f3c19]" />

          <span className="text-sm font-bold text-zinc-500">
            Verificando sessão...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen bg-zinc-50 lg:grid-cols-2">
      {/* ÁREA LATERAL DO DESKTOP */}
      <section className="relative hidden min-h-screen overflow-hidden bg-zinc-950 p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#7f3c19]/30 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[460px] w-[460px] rounded-full bg-[#fdf4c3]/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7f3c19] text-white shadow-lg shadow-[#7f3c19]/20">
            <Store size={25} />
          </div>

          <div>
            <strong className="block text-lg font-black text-white">
              Garage22
            </strong>

            <span className="text-sm text-zinc-400">
              Sistema administrativo
            </span>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-[#f7e7a5]">
            <ShieldCheck size={17} />
            Área administrativa protegida
          </span>

          <h1 className="mt-6 text-4xl font-black leading-tight tracking-[-0.05em] text-white xl:text-5xl">
            Gerencie seus pedidos em um só lugar.
          </h1>

          <p className="mt-5 max-w-lg text-base leading-7 text-zinc-400">
            Acompanhe as vendas, os pedidos, os produtos e todas as informações
            importantes do Garage22.
          </p>

          <div className="mt-10 grid max-w-lg grid-cols-2 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <strong className="block text-2xl font-black text-white">
                100%
              </strong>

              <span className="mt-1 block text-sm text-zinc-400">
                Responsivo
              </span>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <strong className="block text-2xl font-black text-white">
                Seguro
              </strong>

              <span className="mt-1 block text-sm text-zinc-400">
                Sessão protegida
              </span>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} Garage22. Todos os direitos reservados.
        </p>
      </section>

      {/* ÁREA DO FORMULÁRIO */}
      <section className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-zinc-500 transition hover:text-[#7f3c19]"
          >
            <ArrowLeft size={17} />
            Voltar para a loja
          </Link>

          {/* LOGO MOBILE */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7f3c19] text-white shadow-lg shadow-[#7f3c19]/20">
              <Store size={24} />
            </div>

            <div>
              <strong className="block text-lg font-black text-zinc-950">
                Garage22
              </strong>

              <span className="text-sm text-zinc-500">
                Painel administrativo
              </span>
            </div>
          </div>

          <div>
            <span className="text-sm font-black uppercase tracking-[0.16em] text-[#7f3c19]">
              Acesso administrativo
            </span>

            <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-zinc-950 sm:text-4xl">
              Entre na sua conta
            </h2>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Informe suas credenciais para acessar o painel de gerenciamento.
            </p>
          </div>

          {/* AVISO DE ACESSO RESTRITO */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <TriangleAlert
                size={21}
                className="mt-0.5 shrink-0 text-amber-600"
              />

              <div>
                <strong className="block text-sm font-black text-amber-900">
                  Acesso exclusivo da administração
                </strong>

                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Esta área é reservada exclusivamente para a equipe
                  administrativa do Garage22. Clientes não precisam realizar
                  login para visualizar o cardápio ou fazer pedidos.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-zinc-700"
              >
                E-mail
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@garage22.com"
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-4 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#7f3c19]/10 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-zinc-700"
              >
                Senha
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Digite sua senha"
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-zinc-200 bg-white pl-12 pr-12 text-sm font-medium text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-[#7f3c19] focus:ring-4 focus:ring-[#7f3c19]/10 disabled:cursor-not-allowed disabled:opacity-70"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((currentValue) => !currentValue)
                  }
                  disabled={isSubmitting}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-600"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-950 text-sm font-black text-white shadow-lg shadow-zinc-950/15 transition hover:bg-[#7f3c19] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle size={19} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  Entrar no painel
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-zinc-100 p-4 text-zinc-700">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#7f3c19]" size={19} />

            <p className="text-xs font-semibold leading-5">
              O acesso ao painel é protegido. Tentativas de login com
              credenciais não autorizadas poderão ser registradas pelo sistema.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
