"use client";

export default function KakaoMap({ listing, onClose }) {
  const query = encodeURIComponent(`${listing.region_name} ${listing.apt_name}`);
  const kakaoMapUrl = `https://map.kakao.com/?q=${query}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">{listing.apt_name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{listing.region_name} · {listing.area_size}㎡ · {listing.floor}층</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-light">✕</button>
        </div>
        <div className="p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">{listing.apt_name} · {listing.region_name}</p>
          <a href={kakaoMapUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold text-sm px-6 py-3 rounded-xl transition">카카오 지도에서 보기</a>
          <p className="text-xs text-gray-300 mt-3">새 탭에서 카카오 지도가 열려요</p>
        </div>
      </div>
    </div>
  );
} 