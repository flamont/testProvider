const dataUrl = "temporaryData.csv";

const container = document.getElementById("graph-container");
const width = container.clientWidth;
const height = container.clientHeight;

const svg = d3
  .select("#graph-container")
  .append("svg")
  .attr("viewBox", [0, 0, width, height]);

const tooltip = d3.select("#tooltip");

const color = d3.scaleOrdinal(d3.schemeCategory10);

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
      return 1; // group
    })
  );

d3.csv(dataUrl)
  .then((data) => {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    data.forEach((row) => {
      const prenom = row[""]; // The first column is unnamed (Prénom)
      const nom = row.Nom;
      const category = row["Catégorie"];

      if (!prenom || !nom || !category) return; // Skip rows with incomplete data

      const personName = `${prenom} ${nom}`.trim();

      // 1. Add Person Node if it doesn't exist
      if (!nodeSet.has(personName)) {
        nodeSet.add(personName);
        nodes.push({
          id: personName,
          type: "person",
          category: category,
          description: row["Description"],
        });
      }

      // 2. Add Category Node if it doesn't exist
      if (!nodeSet.has(category)) {
        nodeSet.add(category);
        nodes.push({
          id: category,
          type: "category",
          category: "Category Type", // A meta-category for styling purposes
          description: `The "${category}" category.`,
        });
      }

      // 3. Create a link between the Person and their Category
      links.push({ source: personName, target: category });

      // 4. Handle Group Associations
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
      .selectAll("line")
      .data(links)
      .enter()
      .append("line")
      .attr("class", "link");

    const node = svg
      .append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter()
      .append("g")
      .attr("class", "node-group");

    const circles = node
      .append("circle")
      .attr("r", (d) => {
        if (d.type === "category") return 9; // Larger circle for categories
        if (d.type === "person") return 6; // Medium for people
        return 4; // Small for groups
      })
      .attr("fill", (d) => /* color(d.category) */ "red");
    //.call(drag(simulation))
    console.log("hello");

    //Labels
    const labels = node;
    /*  .append("text")
      .text((d) => d.id)
      .attr("class", "node-label")
      .style("fill", (d) => (d.type === "category" ? "black" : "#333"))
      .style("font-size", (d) => (d.type === "category" ? "11px" : "10px"))
      .style("font-weight", (d) => (d.type === "category" ? "bold" : "normal"))
      .attr("x", 0)
      .attr("y", (d) => {
        if (d.type === "person") return 18; // Below person node
        if (d.type === "group") return -14; // Above group node
        return 0; // Centered for category node
      });
 */

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
      link
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y);

      node.attr("transform", (d) => `translate(${d.x},${d.y})`);
    }
  })
  .catch((error) => {
    console.error("Error loading or parsing data:", error);
    container.innerHTML = `<div class="flex items-center justify-center h-full text-red-500 font-semibold">
                <p>Error loading data. Please check the console and ensure 'temporaryData.csv' is accessible.</p>
            </div>`;
  });

// --- Drag functionality ---
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  //   function dragged(event, d) {
  //     d.fx = event.x;
  //     d.fy = event.y;
  //   }

  //   function dragended(event, d) {
  //     if (!event.active) simulation.alphaTarget(0);
  //     d.fx = null;
  //     d.fy = null;
  //   }

  return d3.drag();
  /*   .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended); */
}

// --- Zoom functionality ---
// const zoom = d3
//   .zoom()
//   .scaleExtent([0.1, 1])
//   .on("zoom", (event) => {
//     svg.selectAll("g").attr("transform", event.transform);
//   });

// svg.call(zoom);
