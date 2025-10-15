const dataUrl = "temporaryData.csv";

const container = document.getElementById("graph-container");
let width = container.clientWidth;
let height = container.clientHeight;

const svg = d3
  .select("#graph-container")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

const tooltip = d3.select("#tooltip");

const categories = "#C96C75";
const persons = "#fff";
const groupsAndOrganisations = "#c5c5c5";
const borders = "#000";

const simulation = d3
  .forceSimulation()
  .force(
    "link",
    d3
      .forceLink()
      .id((d) => d.id)
      .distance((d) => {
        // Set different link distances based on node types
        if (d.source.type === "person" && d.target.type === "category") {
          return 12; // Longer links for person-to-category
        }
        return 6; // Shorter for person-to-group
      })
  )
  .force("charge", d3.forceManyBody().strength(-10))
  .force("center", d3.forceCenter(width / 2, height / 2))
  .force(
    "collide",
    d3.forceCollide().radius((d) => {
      // Set collision radius based on node type
      if (d.type === "category") return 20;
      if (d.type === "person") return 14;
      return 5; // group
    })
  );

d3.csv(dataUrl)
  .then((data) => {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();
    data.forEach((row) => {
      const prenom = row[""];
      const nom = row.Nom;
      const category = row["Catégorie"];
      if (!prenom || !nom || !category) return;

      const personName = `${prenom} ${nom}`.trim();

      if (!nodeSet.has(personName)) {
        nodeSet.add(personName);
        nodes.push({
          id: personName,
          type: "person",
          category: category,
          description: row["Description"],
        });
      }

      if (!nodeSet.has(category)) {
        nodeSet.add(category);
        nodes.push({
          id: category,
          type: "category",
          category: "Category Type",
          description: `The "${category}" category.`,
        });
      }

      //create link
      links.push({ source: personName, target: category });

      const associations = row["Association avec un groupe?"];
      if (associations) {
        const groups = associations
          .split("\n")
          .map((g) => g.trim())
          .filter(Boolean);
        groups.forEach((groupName) => {
          // Add Group Node if it doesn't exist
          if (!nodeSet.has(groupName)) {
            nodeSet.add(groupName);
            nodes.push({
              id: groupName,
              type: "group",
              category: "Group/Organization",
              description: `Associated with various individuals.`,
            });
          }
          // Create a link between the Person and the Group
          links.push({ source: personName, target: groupName });
        });
      }
    });

    const link = svg
      .append("g")
      .attr("class", "links")
      .selectAll("path") // Use path for curved lines
      .data(links)
      .enter()
      .append("path") // Use path for curved lines
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 1);

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group")
      .call(drag(simulation));

    const circles = node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "category") return 9; // Larger circle for categories
        if (d.type === "person") return 6; // Medium for people
        return 4; // Small for groups
      })
      .attr("fill", (d) => {
        if (d.type === "category") return categories;
        if (d.type === "person") return persons; // Color for people
        return groupsAndOrganisations; // group && organisation
      })
      .attr("stroke", borders);

    // --- Tooltip Events ---
    node
      .on("mouseover", (event, d) => {
        tooltip.style("opacity", 1);
        tooltip
          .html(
            `<h3>${d.id}</h3><p><strong>Category:</strong> ${
              d.category
            }</p><p>${d.description || ""}</p>`
          )
          .style("left", event.pageX + 15 + "px")
          .style("top", event.pageY - 28 + "px");

        // Highlight connected nodes and links
        link.style("stroke-opacity", (l) =>
          l.source === d || l.target === d ? 1 : 0.1
        );
        link.style("stroke", (l) =>
          l.source === d || l.target === d ? "#333" : "#999"
        );
        node.style("opacity", (n) => {
          const isConnected = links.some(
            (l) =>
              (l.source === d && l.target === n) ||
              (l.target === d && l.source === n) ||
              n === d
          );
          return isConnected ? 1 : 0.2;
        });
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        // Reset styles
        link.style("stroke-opacity", 0.6).style("stroke", "#999");
        node.style("opacity", 1);
      });

    simulation.nodes(nodes).on("tick", ticked);

    simulation.force("link").links(links);

    function ticked() {
      link.attr("d", (d) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy);
        // This is the SVG path command for an arc
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      node.attr("transform", (d) => {
        const radius =
          d.type === "category" ? 20 : d.type === "person" ? 14 : 5;
        d.x = Math.max(radius, Math.min(width - radius, d.x));
        d.y = Math.max(radius, Math.min(height - radius, d.y));
        return `translate(${d.x},${d.y})`;
      });
    }
  })
  .catch((error) => {
    console.error("error load data", error);
    container.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: red; font-weight: bold;">
                    <p>Error loading data. Please check file and console.</p>
                </div>`;
  });

// --- Drag functionality ---
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3
    .drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

// --- Responsive functionality ---
function handleResize() {
  width = container.clientWidth;
  height = container.clientHeight;
  svg.attr("viewBox", [0, 0, width, height]);
  simulation.force("center", d3.forceCenter(width / 2, height / 2));
  simulation.alpha(0.3).restart();
}

window.addEventListener("resize", handleResize);
