export default function POSLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-hidden">
      {children}
    </div>
  )
}

