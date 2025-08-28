"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseBrowser"

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex justify-between items-center">
      <div className="flex space-x-4">
        <Link
          href="/"
          className={`hover:text-yellow-400 ${pathname === "/" ? "text-yellow-400" : ""}`}
        >
          Home
        </Link>

        {/* Opportunità */}
        <Link
          href="/opportunities"
          className={`hover:text-yellow-400 ${pathname === "/opportunities" ? "text-yellow-400" : ""}`}
        >
          Opportunità
        </Link>

        {/* Ricerca Atleti */}
        <Link
          href="/search/athletes"
          className={`hover:text-yellow-400 ${pathname === "/search/athletes" ? "text-yellow-400" : ""}`}
        >
          Atleti
        </Link>

        {/* Ricerca Club */}
        <Link
          href="/search/club"
          className={`hover:text-yellow-400 ${pathname === "/search/club" ? "text-yellow-400" : ""}`}
        >
          Club
        </Link>

        {/* Preferiti */}
        <Link
          href="/favorites"
          className={`hover:text-yellow-400 ${pathname === "/favorites" ? "text-yellow-400" : ""}`}
        >
          Preferiti
        </Link>
      </div>

      <div className="flex space-x-4">
        {user ? (
          <>
            {/* Profilo */}
            <Link
              href="/profile"
              className={`hover:text-yellow-400 ${pathname === "/profile" ? "text-yellow-400" : ""}`}
            >
              Profilo
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                window.location.href = "/"
              }}
              className="hover:text-yellow-400"
            >
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className={`hover:text-yellow-400 ${pathname === "/login" ? "text-yellow-400" : ""}`}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  )
}
