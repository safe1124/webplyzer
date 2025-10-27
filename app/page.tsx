"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import clsx from "clsx"
import { type Locale, localeOptions, messages } from "@/lib/i18n"

type Tool = {
  id: string
  icon: string
  title: string
  description: string
  href?: string
  comingSoon?: boolean
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("ja")

  const t = useMemo(() => messages[locale], [locale])

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale | null
    if (savedLocale && ["ja", "en", "ko"].includes(savedLocale)) {
      setLocale(savedLocale)
    }
  }, [])

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale)
    localStorage.setItem("locale", newLocale)
  }

  const tools: Tool[] = [
    {
      id: "webp-converter",
      icon: "🖼️",
      title: t.image_compress_title,
      description: t.image_compress_desc,
      href: "/converter",
    },
    {
      id: "pdf-compress",
      icon: "📄",
      title: t.pdf_compress_title,
      description: t.pdf_compress_desc,
      comingSoon: true,
    },
    {
      id: "video-compress",
      icon: "🎥",
      title: t.video_compress_title,
      description: t.video_compress_desc,
      href: "/video",
    },
  ]

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-12">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50/50" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-100/30 via-transparent to-transparent" />

      <div className="relative flex w-full max-w-7xl flex-col gap-12">
        <header className="flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-3">
            <div className="text-5xl">🎨</div>
            <h1 className="text-5xl font-bold tracking-tight text-black md:text-6xl">
              {t.main_title}
            </h1>
          </div>
          <p className="text-lg font-medium text-slate-600 md:text-xl">
            {t.main_subtitle}
          </p>
          <div className="flex flex-wrap justify-center gap-2 md:gap-3">
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => handleLocaleChange(option.code)}
                className={clsx(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all duration-200 md:px-5 md:py-2.5",
                  locale === option.code
                    ? "border-blue-200/50 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_4px_16px_0_rgba(59,130,246,0.4)] backdrop-blur-xl"
                    : "border-white/60 bg-white/50 text-slate-700 shadow-sm backdrop-blur-xl hover:border-blue-200/60 hover:bg-white/70 hover:shadow-md",
                )}
              >
                <span>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const isLink = tool.href && !tool.comingSoon
            const cardClasses = clsx(
              "group relative flex flex-col gap-6 rounded-3xl border border-white/60 bg-white/40 p-8 shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300",
              tool.comingSoon
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:-translate-y-2 hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.25)]",
            )

            const cardContent = (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-3xl shadow-[inset_0_1px_1px_0_rgba(255,255,255,0.9)]" />

                {tool.comingSoon && (
                  <div className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 px-3 py-1 text-xs font-bold text-white shadow-lg">
                    {t.coming_soon}
                  </div>
                )}

                <div className="relative flex items-center justify-center">
                  <div className="text-7xl transition-transform duration-300 group-hover:scale-110">
                    {tool.icon}
                  </div>
                </div>

                <div className="relative flex flex-col gap-3">
                  <h3 className="text-2xl font-bold text-black">
                    {tool.title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-slate-600">
                    {tool.description}
                  </p>
                </div>

                {!tool.comingSoon && (
                  <div className="relative mt-auto">
                    <div className="flex items-center gap-2 text-blue-600 font-semibold transition-all duration-300 group-hover:gap-3">
                      <span>{locale === "ja" ? "開始する" : locale === "ko" ? "시작하기" : "Get Started"}</span>
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                )}
              </>
            )

            return isLink && tool.href ? (
              <Link key={tool.id} href={tool.href} className={cardClasses}>
                {cardContent}
              </Link>
            ) : (
              <div key={tool.id} className={cardClasses}>
                {cardContent}
              </div>
            )
          })}
        </main>

        <footer className="text-center text-sm font-medium text-slate-500">
          {t.footer_text}
        </footer>
      </div>
    </div>
  )
}
