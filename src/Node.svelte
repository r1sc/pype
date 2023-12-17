<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";
    import { EvalResult } from "./graph";

    export let x = 0;
    export let y = 0;
    export let width = 200;
    export let height = 100;
    export let src: string = "";
    export let label: string | undefined = "Node";
    export let output: EvalResult | undefined = undefined;

    let me: HTMLDivElement | null;
    let resizeObserver: ResizeObserver | null = null;

    const dispatch = createEventDispatcher<{
        resize: { width: number; height: number };
        compile_requested: undefined;
        output_ball_clicked: undefined;
        on_title_drag: MouseEvent;
        on_ball_drag: MouseEvent;
        delete_clicked: undefined;
    }>();

    onMount(() => {
        if (me === null) return;
        resizeObserver = new ResizeObserver((mutations) => {
            if (me === null) return;
            dispatch("resize", {
                width: mutations[0].contentRect.width,
                height: mutations[0].contentRect.height,
            });
        });
        resizeObserver.observe(me);
    });

    function onKeydown(e: KeyboardEvent) {
        if (e.altKey && e.key === "Enter") {
            dispatch("compile_requested");
        }

        if (e.key === "Tab") {
            e.preventDefault();
            const editor = e.currentTarget as HTMLDivElement;
            var doc = editor.ownerDocument.defaultView!;
            var sel = doc.getSelection()!;
            var range = sel.getRangeAt(0);

            var tabNode = document.createTextNode("\u00a0\u00a0\u00a0\u00a0");
            range.insertNode(tabNode);

            range.setStartAfter(tabNode);
            range.setEndAfter(tabNode);
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }
</script>

<div class="container" style:left={x + "px"} style:top={y + "px"}>
    <div class="node" bind:this={me}>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="top" on:mousedown={(e) => dispatch("on_title_drag", e)}>
            <span
                class="title"
                contenteditable="true"
                spellcheck="false"
                bind:innerText={label}
            ></span>
            <button
                class="delete-btn"
                on:click={() => dispatch("delete_clicked")}>x</button
            >
        </div>
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            class="content"
            contenteditable="true"
            spellcheck="false"
            bind:innerText={src}
            on:blur
            on:keydown={onKeydown}
        />
        {#if output !== undefined}
            {#if output.kind === "ok"}
                <div class="output-ok">{output.text}</div>
            {:else}
                <div class="output-err">{output.message}</div>
            {/if}
        {/if}
    </div>
    <div
        class="output-ball"
        on:click={() => dispatch("output_ball_clicked")}
        on:mousedown={(e) => dispatch("on_ball_drag", e)}
    ></div>
</div>

<style>
    .container {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .node {
        border: 1px solid rgb(122, 122, 179);
        box-shadow: 0px 0px 4px 0px #62acdd9d;
        border-radius: 5px;
        min-width: 150px;
        min-height: 30px;
        background: white;
    }

    .top {
        border-bottom: 1px dashed #ccc;
        padding-left: 2px;
        color: rgb(122, 122, 179);
        cursor: move;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }

    .title {
        outline: none;
        cursor: text;
    }

    .content {
        padding: 10px;
        outline: none;
    }

    .delete-btn {
        border: none;
        background: transparent;
        color: #aaa;
    }

    .output-ok {
        border-top: 1px dashed #aaa;
        padding: 5px;
    }

    .output-err {
        border-top: 1px dashed #aaa;
        padding: 5px;
        color: red;
    }

    .output-ball {
        width: 8px;
        height: 8px;
        background: rgb(80, 80, 80);
        box-shadow: 0px 0px 6px 0px #60fc30;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
