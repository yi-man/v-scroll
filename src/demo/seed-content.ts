const SECTIONS = [
  {
    title: "Virtual Scroll Placeholder",
    body: "This project currently validates the shell, theme path, and custom element registration only.",
  },
  {
    title: "Planned Next Step",
    body: "Future work will replace this static shell with a real scroll container and custom thumb behavior.",
  },
  {
    title: "Assignment Boundary",
    body: "Resize observation, pointer dragging, and detach cleanup are intentionally excluded from this initialization pass.",
  },
];

export const createSeedContent = () => {
  const article = document.createElement("article");

  for (const section of SECTIONS) {
    const block = document.createElement("section"),
      heading = document.createElement("h2"),
      paragraph = document.createElement("p");

    heading.textContent = section.title;
    paragraph.textContent = section.body;
    block.append(heading, paragraph);
    article.append(block);
  }

  return article;
};
