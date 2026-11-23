package com.trishul.transitkrama

import java.util.ArrayDeque

enum class TransitColor {
    CYAN, AMBER, ROSE, LIME, VIOLET, ORANGE;

    companion object {
        val ordered = entries.toList()
    }
}

enum class Direction(val dx: Int, val dy: Int) {
    NORTH(0, -1),
    EAST(1, 0),
    SOUTH(0, 1),
    WEST(-1, 0);

    fun rotate(turns: Int): Direction {
        val normalized = ((turns % 4) + 4) % 4
        return entries[(ordinal + normalized) % 4]
    }
}

enum class VehicleState { PARKED, BAY, CLEARED }
enum class RoundState { PLAYING, WON, DEADLOCKED }

data class VehicleSeed(
    val id: Int,
    val x: Int,
    val y: Int,
    val direction: Direction,
    val color: TransitColor,
    val capacity: Int = 3
)

data class LevelDefinition(
    val id: Int,
    val title: String,
    val width: Int,
    val height: Int,
    val bayCount: Int,
    val vehicles: List<VehicleSeed>,
    val passengerQueue: List<TransitColor>,
    val solutionOrder: List<Int>
)

data class Vehicle(
    val id: Int,
    val x: Int,
    val y: Int,
    val direction: Direction,
    val color: TransitColor,
    val capacity: Int,
    var state: VehicleState = VehicleState.PARKED,
    var bayIndex: Int = -1,
    var boarded: Int = 0
)

data class Bay(val index: Int, var vehicleId: Int? = null)

sealed class DispatchResult {
    data class Success(
        val vehicleId: Int,
        val bayIndex: Int,
        val boardedPassengers: Int,
        val departedVehicleIds: List<Int>,
        val roundState: RoundState
    ) : DispatchResult()

    data class Blocked(val vehicleId: Int, val blockerId: Int) : DispatchResult()
    data class NoBay(val vehicleId: Int) : DispatchResult()
    data object Ignored : DispatchResult()
}

private data class EngineSnapshot(
    val queue: List<TransitColor>,
    val vehicleStates: List<VehicleSnapshot>,
    val bays: List<Int?>,
    val moves: Int,
    val roundState: RoundState
)

private data class VehicleSnapshot(
    val id: Int,
    val state: VehicleState,
    val bayIndex: Int,
    val boarded: Int
)

class TransitGameEngine(level: LevelDefinition) {
    var level: LevelDefinition = level
        private set

    val vehicles: MutableList<Vehicle> = mutableListOf()
    val bays: MutableList<Bay> = mutableListOf()
    val passengerQueue: ArrayDeque<TransitColor> = ArrayDeque()

    var moves: Int = 0
        private set

    var roundState: RoundState = RoundState.PLAYING
        private set

    private val undoStack = ArrayDeque<EngineSnapshot>()

    init {
        reset(level)
    }

    fun reset(newLevel: LevelDefinition = level) {
        level = newLevel
        vehicles.clear()
        vehicles += newLevel.vehicles.map {
            Vehicle(
                id = it.id,
                x = it.x,
                y = it.y,
                direction = it.direction,
                color = it.color,
                capacity = it.capacity
            )
        }
        bays.clear()
        repeat(newLevel.bayCount) { bays += Bay(it) }
        passengerQueue.clear()
        passengerQueue.addAll(newLevel.passengerQueue)
        undoStack.clear()
        moves = 0
        roundState = RoundState.PLAYING
    }

    fun vehicle(id: Int): Vehicle? = vehicles.firstOrNull { it.id == id }

    fun rayBlocker(vehicleId: Int): Vehicle? {
        val source = vehicle(vehicleId) ?: return null
        if (source.state != VehicleState.PARKED) return null

        return vehicles
            .asSequence()
            .filter { it.id != source.id && it.state == VehicleState.PARKED }
            .filter { candidate ->
                when (source.direction) {
                    Direction.NORTH -> candidate.x == source.x && candidate.y < source.y
                    Direction.SOUTH -> candidate.x == source.x && candidate.y > source.y
                    Direction.EAST -> candidate.y == source.y && candidate.x > source.x
                    Direction.WEST -> candidate.y == source.y && candidate.x < source.x
                }
            }
            .minByOrNull { candidate ->
                kotlin.math.abs(candidate.x - source.x) + kotlin.math.abs(candidate.y - source.y)
            }
    }

    fun dispatch(vehicleId: Int): DispatchResult {
        if (roundState != RoundState.PLAYING) return DispatchResult.Ignored
        val selected = vehicle(vehicleId) ?: return DispatchResult.Ignored
        if (selected.state != VehicleState.PARKED) return DispatchResult.Ignored

        val blocker = rayBlocker(vehicleId)
        if (blocker != null) return DispatchResult.Blocked(vehicleId, blocker.id)

        val freeBay = bays.firstOrNull { it.vehicleId == null }
            ?: return DispatchResult.NoBay(vehicleId)

        undoStack.addLast(snapshot())
        if (undoStack.size > 32) undoStack.removeFirst()

        selected.state = VehicleState.BAY
        selected.bayIndex = freeBay.index
        freeBay.vehicleId = selected.id
        moves += 1

        val departed = mutableListOf<Int>()
        val boarded = drainBoarding(departed)

        roundState = when {
            passengerQueue.isEmpty() && vehicles.all { it.state == VehicleState.CLEARED } -> RoundState.WON
            isDeadlocked() -> RoundState.DEADLOCKED
            else -> RoundState.PLAYING
        }

        return DispatchResult.Success(
            vehicleId = selected.id,
            bayIndex = freeBay.index,
            boardedPassengers = boarded,
            departedVehicleIds = departed,
            roundState = roundState
        )
    }

    fun canUndo(): Boolean = undoStack.isNotEmpty()

    fun undo(): Boolean {
        val snapshot = undoStack.pollLast() ?: return false
        restore(snapshot)
        return true
    }

    fun hintVehicleId(): Int? {
        level.solutionOrder.forEach { id ->
            val candidate = vehicle(id)
            if (candidate?.state == VehicleState.PARKED && rayBlocker(id) == null) return id
        }
        return vehicles.firstOrNull { it.state == VehicleState.PARKED && rayBlocker(it.id) == null }?.id
    }

    fun progress(): Float {
        val total = level.passengerQueue.size.coerceAtLeast(1)
        return 1f - passengerQueue.size.toFloat() / total.toFloat()
    }

    fun isDeadlocked(): Boolean {
        if (roundState == RoundState.WON || passengerQueue.isEmpty()) return false

        val front = passengerQueue.peekFirst() ?: return false
        val canBoardNow = bays.any { bay ->
            val bus = bay.vehicleId?.let(::vehicle)
            bus != null && bus.color == front && bus.boarded < bus.capacity
        }
        if (canBoardNow) return false

        val hasFreeBay = bays.any { it.vehicleId == null }
        if (hasFreeBay && vehicles.any { it.state == VehicleState.PARKED && rayBlocker(it.id) == null }) return false

        return bays.all { it.vehicleId != null } ||
            vehicles.none { it.state == VehicleState.PARKED && rayBlocker(it.id) == null }
    }

    private fun drainBoarding(departed: MutableList<Int>): Int {
        var boardedTotal = 0
        var keepDraining = true
        while (keepDraining && passengerQueue.isNotEmpty()) {
            keepDraining = false
            val front = passengerQueue.peekFirst() ?: break
            val matchingBay = bays.firstOrNull { bay ->
                val bus = bay.vehicleId?.let(::vehicle)
                bus != null && bus.color == front && bus.boarded < bus.capacity
            }

            if (matchingBay != null) {
                val bus = vehicle(matchingBay.vehicleId!!) ?: break
                passengerQueue.removeFirst()
                bus.boarded += 1
                boardedTotal += 1
                keepDraining = true

                if (bus.boarded >= bus.capacity) {
                    bus.state = VehicleState.CLEARED
                    bus.bayIndex = -1
                    matchingBay.vehicleId = null
                    departed += bus.id
                }
            }
        }
        return boardedTotal
    }

    private fun snapshot(): EngineSnapshot = EngineSnapshot(
        queue = passengerQueue.toList(),
        vehicleStates = vehicles.map {
            VehicleSnapshot(it.id, it.state, it.bayIndex, it.boarded)
        },
        bays = bays.map { it.vehicleId },
        moves = moves,
        roundState = roundState
    )

    private fun restore(snapshot: EngineSnapshot) {
        passengerQueue.clear()
        passengerQueue.addAll(snapshot.queue)
        snapshot.vehicleStates.forEach { saved ->
            vehicle(saved.id)?.apply {
                state = saved.state
                bayIndex = saved.bayIndex
                boarded = saved.boarded
            }
        }
        snapshot.bays.forEachIndexed { index, vehicleId -> bays[index].vehicleId = vehicleId }
        moves = snapshot.moves
        roundState = snapshot.roundState
    }
}
