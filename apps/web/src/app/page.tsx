export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6 py-16">
      <p className="text-sm text-neutral-600">Product lead case study</p>
      <h1 className="text-4xl font-semibold tracking-tight">InDebted</h1>
      <p className="text-lg leading-8">
        The project is initialized. The demonstration will follow the product recommendation.
      </p>
      <a className="w-fit underline underline-offset-4" href="/api/health">
        Check backend connection
      </a>
    </main>
  );
}
