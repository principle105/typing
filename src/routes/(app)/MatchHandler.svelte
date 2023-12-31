<script lang="ts">
    import { onMount } from "svelte";
    import { io } from "socket.io-client";
    import type { User } from "lucia";
    import type { Room, MatchUser, Replay, RoomInfo } from "$lib/types";
    import { useMatchMode } from "$lib/stores/store";

    import CasualMatch from "./CasualMatch.svelte";
    import RankedMatch from "./RankedMatch.svelte";
    import { DEFAULT_FONT_SCALE } from "$lib/config";

    export let user: User | undefined;
    export let sessionId: string | undefined;

    let replay: Replay = [];
    let roomInfo: RoomInfo;
    let matchUsers = new Map<string, MatchUser>();

    const match = useMatchMode();

    const socket = io({
        query: {
            token: sessionId ? sessionId : "",
        },
    });

    socket.on("user-disconnect", (userId: string) => {
        matchUsers.delete(userId);
        matchUsers = matchUsers;
    });

    socket.on("existing-room-info", (existingRoomInfo: Room) => {
        matchUsers = new Map(Object.entries(existingRoomInfo.users));

        // Separating the room info from the users to avoid rerendering static data when the uses change
        roomInfo = {
            roomId: existingRoomInfo.roomId,
            quote: existingRoomInfo.quote,
            startTime: existingRoomInfo.startTime,
        };
    });

    socket.on("server-update-user", (matchUser: MatchUser) => {
        matchUsers.set(matchUser.id, matchUser);
        matchUsers = matchUsers;
    });

    socket.on("disconnect", () => {
        match.set(null);
    });

    const updateUser = (replay: Replay) => {
        if (replay.length === 0) return;

        socket.emit("client-update-user", replay);
    };

    onMount(() => {
        const interval = setInterval(() => {
            date = Date.now();

            if (roomInfo.startTime <= date) {
                clearInterval(interval);
            }
        }, 250);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    });

    const getUser = () => {
        if (user) return user;

        // TODO: eventually fetch this from the local storage
        return {
            id: "",
            userId: "",
            name: "Guest",
            email: "",
            rating: 0,
            fontScale: DEFAULT_FONT_SCALE,
        } satisfies User;
    };

    let date: number = Date.now();
    $: replay, updateUser(replay);
</script>

{#if !roomInfo || $match === null}
    <div>Loading...</div>
{:else}
    {@const started = roomInfo.startTime <= date}
    {#if !started}
        <div
            class="absolute inset-0 bg-black/30 flex justify-center items-center"
        >
            <div class="text-5xl text-white">
                {Math.round((roomInfo.startTime - date) / 1000)}
            </div>
        </div>
    {/if}

    {#if $match.type === "ranked"}
        <RankedMatch
            user={getUser()}
            {roomInfo}
            {matchUsers}
            {started}
            bind:replay
        />
    {:else if $match.type === "casual"}
        <CasualMatch />
    {:else if $match.type === "private"}
        <section>
            <div>Private Room</div>
        </section>
    {/if}
{/if}
