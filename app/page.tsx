"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import clsx from "clsx"
import { type Locale, localeOptions, messages } from "@/lib/i18n"

type Tool = {
  id: string
  icon: string
  iconImage?: string
  title: string
  description: string
  href?: string
  comingSoon?: boolean
}

export default function HomePage() {
  const [locale, setLocale] = useState<Locale>("ja")
  const [mounted, setMounted] = useState(false)

  const t = useMemo(() => messages[locale], [locale])

  useEffect(() => {
    setMounted(true)
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
      iconImage: "/Webp.png",
      title: t.image_compress_title,
      description: t.image_compress_desc,
      href: "/converter",
    },
    {
      id: "pdf-compress",
      icon: "📄",
      iconImage: "/pdf.png",
      title: t.pdf_compress_title,
      description: t.pdf_compress_desc,
      comingSoon: true,
    },
    {
      id: "video-compress",
      icon: "🎥",
      iconImage: "/video.png",
      title: t.video_compress_title,
      description: t.video_compress_desc,
      comingSoon: true,
    },
  ]

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-4 py-16 md:py-20">
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50" />
      <div className="fixed inset-0 -z-10 bg-gradient-to-tr from-yellow-100/40 via-amber-100/30 to-orange-100/40" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_30%_20%,_rgba(251,191,36,0.15)_0%,_transparent_50%)]" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_70%_80%,_rgba(249,115,22,0.12)_0%,_transparent_50%)]" />

      <div className="liquid-blob fixed left-[10%] top-[15%] -z-10 h-[500px] w-[500px] bg-gradient-to-br from-yellow-300/30 via-amber-300/25 to-orange-300/20 blur-3xl" />
      <div className="liquid-blob-slow fixed right-[15%] bottom-[20%] -z-10 h-[600px] w-[600px] bg-gradient-to-br from-orange-300/25 via-amber-300/30 to-yellow-300/20 blur-3xl" />
      <div className="liquid-pulse fixed left-[50%] top-[50%] -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-amber-200/20 via-yellow-200/25 to-orange-200/20 blur-3xl" />

      <div
        className="float-bubble fixed left-[20%] top-0 -z-10 h-32 w-32 rounded-full bg-gradient-to-br from-yellow-300/40 to-amber-300/30 blur-2xl"
        style={{ animationDuration: "15s", animationDelay: "0s" }}
      />
      <div
        className="float-bubble fixed left-[60%] top-0 -z-10 h-24 w-24 rounded-full bg-gradient-to-br from-orange-300/35 to-yellow-300/25 blur-2xl"
        style={{ animationDuration: "20s", animationDelay: "3s" }}
      />
      <div
        className="float-bubble fixed left-[80%] top-0 -z-10 h-28 w-28 rounded-full bg-gradient-to-br from-amber-300/30 to-orange-300/20 blur-2xl"
        style={{ animationDuration: "18s", animationDelay: "6s" }}
      />

      <div
        className={clsx(
          "relative flex w-full max-w-7xl flex-col gap-16 transition-all duration-1000",
          mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
        )}
      >
        <header className="flex flex-col items-center gap-8 text-center">
          <div className="relative rounded-[3rem] border border-white/60 bg-white/40 px-12 py-10 shadow-[0_8px_32px_0_rgba(251,191,36,0.25)] backdrop-blur-2xl backdrop-saturate-150">
            {/* Inner glow effect */}
            <div className="pointer-events-none absolute inset-0 rounded-[3rem] shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.9)]" />

            {/* Shimmer effect overlay */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[3rem]">
              <div className="shimmer-effect absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>

            <div className="group relative flex flex-col items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="text-6xl transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12 md:text-7xl">
                  🎨
                </div>
                <h1 className="bg-gradient-to-br from-amber-900 via-orange-800 to-yellow-900 bg-clip-text text-5xl font-bold tracking-tight text-transparent md:text-7xl">
                  {t.main_title}
                </h1>
              </div>

              {/* Subtitle */}
              <p className="max-w-2xl text-balance text-lg font-semibold leading-relaxed text-amber-900/80 md:text-xl">
                {t.main_subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {localeOptions.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => handleLocaleChange(option.code)}
                className={clsx(
                  "group relative flex items-center gap-2.5 overflow-hidden rounded-2xl border px-5 py-3 text-sm font-semibold transition-all duration-300 md:px-6 md:py-3.5",
                  locale === option.code
                    ? "border-amber-300/60 bg-gradient-to-br from-amber-500 via-orange-500 to-yellow-500 text-white shadow-[0_8px_24px_-4px_rgba(251,191,36,0.6)] scale-105 backdrop-blur-xl"
                    : "border-white/80 bg-white/50 text-amber-900 shadow-sm backdrop-blur-xl hover:border-amber-300/80 hover:bg-white/70 hover:shadow-lg hover:scale-105",
                )}
              >
                <div className="liquid-wave pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="text-lg">{option.emoji}</span>
                <span className="relative">{option.label}</span>
              </button>
            ))}
          </div>
        </header>

        <main className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {tools.map((tool, index) => {
            const isLink = tool.href && !tool.comingSoon
            const cardClasses = clsx(
              "group relative flex flex-col gap-6 overflow-hidden rounded-[2.5rem] border border-white/70 bg-white/50 p-8 shadow-[0_8px_32px_-8px_rgba(251,191,36,0.3)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-500 md:p-10",
              tool.comingSoon
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:-translate-y-3 hover:shadow-[0_20px_48px_-8px_rgba(251,191,36,0.4)] hover:border-amber-300/70 hover:bg-white/60",
              mounted && `animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:${index * 100}ms]`,
            )

            const cardContent = (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] shadow-[inset_0_2px_4px_0_rgba(255,255,255,0.95)]" />

                <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-yellow-100/0 via-amber-100/0 to-orange-100/0 opacity-0 transition-all duration-500 group-hover:from-yellow-100/40 group-hover:via-amber-100/30 group-hover:to-orange-100/40 group-hover:opacity-100" />

                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2.5rem]">
                  <div className="liquid-wave absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>

                {/* Coming soon badge with liquid glass */}
                {tool.comingSoon && (
                  <div className="absolute right-5 top-5 rounded-full border border-white/60 bg-gradient-to-r from-amber-400 via-orange-400 to-orange-500 px-4 py-1.5 text-xs font-bold text-white shadow-[0_4px_16px_0_rgba(251,191,36,0.5)] backdrop-blur-xl">
                    {t.coming_soon}
                  </div>
                )}

                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="liquid-pulse h-32 w-32 rounded-full bg-gradient-to-br from-yellow-200/60 via-amber-200/50 to-orange-200/60 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
                  </div>
                  <div className="relative transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                    {tool.iconImage ? (
                      <Image
                        src={tool.iconImage}
                        alt={tool.title}
                        width={180}
                        height={180}
                        className="h-40 w-40 md:h-44 md:w-44"
                      />
                    ) : (
                      <div className="text-7xl md:text-8xl">{tool.icon}</div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="relative flex flex-col gap-3">
                  <h3 className="text-balance text-2xl font-bold tracking-tight text-amber-950 md:text-3xl">
                    {tool.title}
                  </h3>
                  <p className="text-pretty text-sm font-medium leading-relaxed text-amber-900/70 md:text-base">
                    {tool.description}
                  </p>
                </div>

                {!tool.comingSoon && (
                  <div className="relative mt-auto pt-2">
                    <div className="group/cta relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-yellow-500/10 px-6 py-3 font-semibold text-amber-900 backdrop-blur-xl transition-all duration-300 group-hover:gap-4 group-hover:border-amber-400/80 group-hover:from-amber-500/20 group-hover:via-orange-500/20 group-hover:to-yellow-500/20 group-hover:shadow-[0_4px_16px_0_rgba(251,191,36,0.3)]">
                      {/* Shimmer effect */}
                      <div className="shimmer-effect pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 transition-opacity duration-300 group-hover/cta:opacity-100" />
                      <span className="relative text-sm md:text-base">
                        {locale === "ja" ? "開始する" : locale === "ko" ? "시작하기" : "Get Started"}
                      </span>
                      <span className="relative text-xl transition-transform duration-300 group-hover:translate-x-1">
                        →
                      </span>
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

        <footer className="rounded-2xl border border-white/60 bg-white/40 px-6 py-4 text-center text-sm font-medium text-amber-900/70 shadow-sm backdrop-blur-xl">
          {t.footer_text}
        </footer>
      </div>
    </div>
  )
}
