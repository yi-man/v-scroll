export const createDemoData = () =>
  Array.from({ length: 100 }, (_, index) => ({
    description: `This is the description for item ${index + 1}`,
    id: index,
    title: `Item ${index + 1}`,
  }));
