import { useNavigate } from "react-router-dom";

const categories = {
  food: [
    "Bajra","Wheat","Rice","Maize","Tomato","Onion","Potato",
    "Sugarcane","Cotton","Soybean","Groundnut","Barley"
  ],
  chemicals: [
    "Urea","DAP","Potash","Pesticide","Fungicide","Herbicide"
  ]
};

export default function MarketCategories() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Market Categories</h1>

      <h2 className="text-xl">🌾 Food Crops</h2>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {categories.food.map(item => (
          <button
            key={item}
            onClick={() => navigate(`/market/${item}`)}
            className="p-3 bg-green-600 text-white rounded"
          >
            {item}
          </button>
        ))}
      </div>

      <h2 className="text-xl mt-6">🧪 Chemicals</h2>
      <div className="grid grid-cols-3 gap-3 mt-2">
        {categories.chemicals.map(item => (
          <button
            key={item}
            onClick={() => navigate(`/market/${item}`)}
            className="p-3 bg-blue-600 text-white rounded"
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}