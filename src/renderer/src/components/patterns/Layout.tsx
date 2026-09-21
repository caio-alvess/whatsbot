import React from 'react'

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="container max-w-3/4 mx-auto font-bold py-4">
        <h1 className="text-primary text-3xl text-center mb-4">WhatsBot</h1>
        <main>{children}</main>
      </div>
    </>
  )
}

export default Layout
