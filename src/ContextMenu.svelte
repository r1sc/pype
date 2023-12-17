<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        createNode: MouseEvent
    }>();
</script>

<div class="contextmenu">
    <ul>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <li on:click={e => dispatch("createNode", e)}>Create node here</li>
    </ul>
</div>

<style>
    .contextmenu {
        position: absolute;
        left: var(--left);
        top: var(--top);
        border: 1px solid #410cff;
        box-shadow: 0px 0px 4px 0px #410cff;
        background: #ffffff;
    }
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    ul li {
        padding: 10px;
        display: block;
        cursor: pointer;
    }
    ul li:hover {
        background: #ececec;
    }
</style>
