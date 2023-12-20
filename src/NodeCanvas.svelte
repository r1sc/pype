<script lang="ts">
    import { transform } from "esbuild";
    import ContextMenu from "./ContextMenu.svelte";
    import Node from "./Node.svelte";
    import { CodeNode, Graph } from "./graph";

    let min_x = Number.MAX_SAFE_INTEGER;
    let min_y = Number.MAX_SAFE_INTEGER;
    let max_x = Number.MIN_SAFE_INTEGER;
    let max_y = Number.MIN_SAFE_INTEGER;

    let graph = new Graph();
    if (!graph.load_from_localstorage()) {
        graph.nodes = [
            new CodeNode("2 + 5", 50, 80, graph.root),
            new CodeNode("", 100, 200, graph.root),
            new CodeNode("", 500, 230, graph.root),
            new CodeNode("", 300, 100, graph.root),
        ];

        graph.edges.push({ from: graph.nodes[1], to: graph.nodes[2] });
        graph.edges.push({ from: graph.nodes[3], to: graph.nodes[2] });
    }

    for (const node of graph.nodes) {
        if (node.x < min_x) min_x = node.x;
        if (node.y < min_y) min_y = node.y;
        if (node.x + node.width > max_x) max_x = node.x + node.width;
        if (node.y + node.height > max_y) max_y = node.y + node.height;
    }

    let current_node: {
        node: CodeNode;
        offsetX: number;
        offsetY: number;
    } | null = null;

    let current_edge: {
        from: CodeNode;
        offsetX: number;
        offsetY: number;
    } | null = null;

    function path_between(ax: number, ay: number, bx: number, by: number) {
        const p1x = ax;
        const p1y = (by - ay) / 2 + ay;

        const p2x = bx;
        const p2y = ay;

        return `M${ax},${ay} C${p1x},${p1y} ${p2x},${p2y} ${bx},${by}`;
    }

    function updateBoxSize(node: CodeNode, width: number, height: number) {
        node.width = width;
        node.height = height;
        graph = graph;
    }

    function onNodeDown(node: CodeNode, offsetX: number, offsetY: number) {
        current_node = { node: node, offsetX, offsetY };
    }

    function onBallDown(node: CodeNode, offsetX: number, offsetY: number) {
        current_edge = { from: node, offsetX, offsetY };
    }

    let canvas_translate_x = 0;
    let canvas_translate_y = 0;

    function onMouseMove(e: MouseEvent) {
        if (current_node) {
            current_node.node.x =
                e.pageX - canvas_translate_x - current_node.offsetX;
            current_node.node.y =
                e.pageY - canvas_translate_y - current_node.offsetY;

            if (current_node.node.x < min_x) min_x = current_node.node.x;
            if (current_node.node.y < min_y) min_y = current_node.node.y;
            if (current_node.node.x + current_node.node.width > max_x)
                max_x = current_node.node.x + current_node.node.width;
            if (current_node.node.y + current_node.node.height > max_y)
                max_y = current_node.node.y + current_node.node.height;
            graph = graph;
        } else if (current_edge) {
            current_edge.offsetX = e.pageX - canvas_translate_x;
            current_edge.offsetY = e.pageY - canvas_translate_y;
        }
    }

    let canvas_drag: {
        start_x: number;
        start_y: number;
        offsetX: number;
        offsetY: number;
    } | null = null;

    function onCanvasMouseDown(e: MouseEvent) {
        if (e.button === 1) {
            canvas_drag = {
                start_x: canvas_translate_x,
                start_y: canvas_translate_y,
                offsetX: e.pageX,
                offsetY: e.pageY,
            };
        }
    }
    function onCanvasMouseMove(e: MouseEvent) {
        if (canvas_drag) {
            canvas_translate_x =
                canvas_drag.start_x + e.pageX - canvas_drag.offsetX;
            canvas_translate_y =
                canvas_drag.start_y + e.pageY - canvas_drag.offsetY;
        }
    }

    function onMouseUp() {
        current_node = null;
        canvas_drag = null;

        if (current_edge !== null) {
            for (const node of graph.nodes) {
                if (
                    node !== current_edge.from &&
                    current_edge.offsetX >= node.x &&
                    current_edge.offsetX <= node.x + node.width &&
                    current_edge.offsetY >= node.y &&
                    current_edge.offsetY <= node.y + node.height
                ) {
                    graph.edges.push({ from: current_edge.from, to: node });
                }
            }
            graph = graph;
            current_edge = null;
        }
    }

    let zoom = 1;
    function onWheel(e: WheelEvent) {
        zoom -= 0.5 * Math.sign(e.deltaY);
    }

    function compile_and_run_box(node: CodeNode) {
        graph.compile_and_run_node(node);
        graph = graph;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            graph.save_to_localstorage();
        }
    }

    function add_child_to(node: CodeNode) {
        const child = new CodeNode(
            "",
            node.x,
            node.y + node.height + 20,
            graph.root,
        );
        graph.nodes.push(child);
        graph.edges.push({ from: node, to: child });

        graph = graph;
    }

    function deleteNode(node: CodeNode) {
        if (confirm("Sure you want to delete this node?")) {
            graph.delete_node(node);
            graph = graph;
        }
    }

    let showContextMenu = false;
    let contextMenuPos = { x: 0, y: 0 };
    function onContextMenu(e: MouseEvent) {
        e.preventDefault();
        showContextMenu = true;
        contextMenuPos = {
            x: e.pageX - canvas_translate_x,
            y: e.pageY - canvas_translate_y,
        };
    }

    function create_node(e: MouseEvent) {
        const node = new CodeNode(
            "",
            e.pageX - canvas_translate_x,
            e.pageY - canvas_translate_y,
            graph.root,
        );
        graph.nodes.push(node);

        if (node.x < min_x) min_x = node.x;
        if (node.y < min_y) min_y = node.y;
        if (node.x + node.width > max_x) max_x = node.x + node.width;
        if (node.y + node.height > max_y) max_y = node.y + node.height;

        graph = graph;
        showContextMenu = false;
    }

    function onClick() {
        showContextMenu = false;
    }
</script>

<svelte:window on:keydown={onKeydown} />
<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="container"
    on:mousedown={onCanvasMouseDown}
    on:mousemove={onCanvasMouseMove}
    on:mouseup={onMouseUp}
    on:wheel={onWheel}
    on:contextmenu={onContextMenu}
    on:mousemove={onMouseMove}
    on:click={onClick}
>
    <div
        class="container"
        style:transform={`translate(${canvas_translate_x}px, ${canvas_translate_y}px) scale(${zoom})`}
    >
        <svg
            style:left={min_x}
            style:top={min_y}
            style:width={max_x - min_x}
            style:height={max_y - min_y}
        >
            {#each graph.edges as edge}
                <path
                    d={path_between(
                        edge.from.x + edge.from.width / 2 - min_x,
                        edge.from.y + edge.from.height - min_y,
                        edge.to.x + edge.to.width / 2 - min_x,
                        edge.to.y - min_y,
                    )}
                />
            {/each}
            {#if current_edge}
                <path
                    d={path_between(
                        current_edge.from.x + current_edge.from.width / 2 - min_x,
                        current_edge.from.y + current_edge.from.height - min_y,
                        current_edge.offsetX - min_x,
                        current_edge.offsetY - min_y,
                    )}
                />
            {/if}
        </svg>

        {#each graph.nodes as node}
            <Node
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                bind:src={node.src}
                bind:label={node.title}
                output={node.output}
                on:resize={(e) =>
                    updateBoxSize(node, e.detail.width, e.detail.height)}
                on:on_title_drag={(e) =>
                    onNodeDown(node, e.detail.offsetX, e.detail.offsetY)}
                on:compile_requested={() => compile_and_run_box(node)}
                on:output_ball_clicked={() => add_child_to(node)}
                on:on_ball_drag={(e) =>
                    onBallDown(
                        node,
                        e.detail.pageX - canvas_translate_x,
                        e.detail.pageY - canvas_translate_y,
                    )}
                on:delete_clicked={() => deleteNode(node)}
            />
        {/each}

        {#if showContextMenu}
            <ContextMenu
                --left="{contextMenuPos.x}px"
                --top="{contextMenuPos.y}px"
                on:createNode={(e) => create_node(e.detail)}
            ></ContextMenu>
        {/if}
    </div>
</div>
<svg class="svg-bg">
    <pattern
        id="pattern-heroundefined"
        x={canvas_translate_x}
        y={canvas_translate_y}
        width="20"
        height="20"
        patternUnits="userSpaceOnUse"
        patternTransform="translate(-0.5,-0.5)"
    >
        <circle cx="0.5" cy="0.5" r="0.5" fill="#91919a" />
    </pattern>
    <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="url(#pattern-heroundefined)"
    />
</svg>

<style>
    .container {
        position: absolute;
        width: 100%;
        height: 100%;
        z-index: 4;
    }

    .node-canvas {
        position: absolute;
        width: 100%;
        height: 100%;
    }

    svg {
        position: absolute;
    }

    .svg-bg {
        width: 100%;
        height: 100%;
    }

    path {
        stroke: #aaa;
        fill: transparent;
    }

    .output {
        position: absolute;
    }
</style>
