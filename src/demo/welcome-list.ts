export const createWelcomeList = (count = 100) => {
  const container = document.createElement("div");

  for (let i = 1; i <= count; i++) {
    const item = document.createElement("div");
    item.textContent = `Welcome to vibe ${i}`;
    item.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid #f0f0f0;
      font-size: 14px;
      color: #333;
      transition: background-color 0.15s ease;
    `;
    item.addEventListener("mouseenter", () => {
      item.style.backgroundColor = "#f5f5f5";
    });
    item.addEventListener("mouseleave", () => {
      item.style.backgroundColor = "";
    });
    container.append(item);
  }

  return container;
};
