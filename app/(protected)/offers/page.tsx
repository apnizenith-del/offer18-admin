export default function OffersPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Offers</h1>
        <a className="px-4 py-2 rounded-xl bg-white text-black" href="/offers/new">
          Create Offer
        </a>
      </div>
      <p className="text-white/60 mt-2">Implement table with server-side pagination here.</p>
    </div>
  );
}
