export const calculateVehicle = (l, w, h, weight) => {
  const wt = Number(weight), length = Number(l), width = Number(w);
  if (wt < 50   && length < 100)              return 'Two Wheeler (Bike)';
  if (wt <= 800  && length <= 200 && width <= 150) return '3-Wheeler Cargo Auto';
  if (wt <= 4000 && length <= 430 && width <= 210) return 'Small Lorry (4-Wheel)';
  if (wt <= 16000&& length <= 700 && width <= 250) return 'Medium Lorry (6-Wheel)';
  return 'Heavy Duty Truck (Multi-Axle)';
};
