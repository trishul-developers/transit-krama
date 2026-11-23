package com.trishul.transitkrama

object LevelFactory {
    private data class Layout(
        val width: Int,
        val height: Int,
        val seeds: List<RawSeed>,
        val solution: List<Int>
    )

    private data class RawSeed(
        val id: Int,
        val x: Int,
        val y: Int,
        val direction: Direction
    )

    private val depot8 = Layout(
        7, 7,
        listOf(
            RawSeed(0, 5, 1, Direction.EAST),
            RawSeed(1, 2, 1, Direction.EAST),
            RawSeed(2, 1, 5, Direction.WEST),
            RawSeed(3, 4, 5, Direction.WEST),
            RawSeed(4, 6, 0, Direction.NORTH),
            RawSeed(5, 6, 3, Direction.NORTH),
            RawSeed(6, 0, 6, Direction.SOUTH),
            RawSeed(7, 0, 3, Direction.SOUTH)
        ),
        listOf(0, 2, 4, 6, 1, 3, 5, 7)
    )

    private val depot10 = Layout(
        7, 7,
        listOf(
            RawSeed(0, 5, 1, Direction.EAST),
            RawSeed(1, 3, 1, Direction.EAST),
            RawSeed(2, 1, 1, Direction.EAST),
            RawSeed(3, 1, 5, Direction.WEST),
            RawSeed(4, 3, 5, Direction.WEST),
            RawSeed(5, 5, 5, Direction.WEST),
            RawSeed(6, 6, 0, Direction.NORTH),
            RawSeed(7, 6, 3, Direction.NORTH),
            RawSeed(8, 0, 6, Direction.SOUTH),
            RawSeed(9, 0, 3, Direction.SOUTH)
        ),
        listOf(0, 3, 6, 8, 1, 4, 7, 9, 2, 5)
    )

    private val depot12 = Layout(
        7, 7,
        listOf(
            RawSeed(0, 5, 1, Direction.EAST),
            RawSeed(1, 3, 1, Direction.EAST),
            RawSeed(2, 1, 1, Direction.EAST),
            RawSeed(3, 1, 5, Direction.WEST),
            RawSeed(4, 3, 5, Direction.WEST),
            RawSeed(5, 5, 5, Direction.WEST),
            RawSeed(6, 6, 0, Direction.NORTH),
            RawSeed(7, 6, 2, Direction.NORTH),
            RawSeed(8, 6, 4, Direction.NORTH),
            RawSeed(9, 0, 6, Direction.SOUTH),
            RawSeed(10, 0, 4, Direction.SOUTH),
            RawSeed(11, 0, 2, Direction.SOUTH)
        ),
        listOf(0, 3, 6, 9, 1, 4, 7, 10, 2, 5, 8, 11)
    )

    private val names = listOf(
        "Morning Depot", "Bazaar Crossing", "Metro Link", "Harbour Loop", "Garden Terminal",
        "Old City Gate", "River Exchange", "Airport Spur", "Night Depot", "Festival Route",
        "Monsoon Junction", "Tech Park", "Temple Road", "Hill Terminal", "Central Exchange",
        "Ring Road", "Market Rush", "Stadium Flow", "Civic Square", "Grand Terminal",
        "South Yard", "East Exchange", "Clocktower", "Airport Night", "Royal Depot",
        "City Grid", "Outer Ring", "Rush Hour", "Final Exchange", "Chakravyuha"
    )

    fun count(): Int = 30

    fun create(levelId: Int): LevelDefinition {
        val id = levelId.coerceIn(1, count())
        val layout = when {
            id <= 8 -> depot8
            id <= 19 -> depot10
            else -> depot12
        }
        val turns = (id - 1) % 4
        val bayCount = when {
            id <= 4 -> 4
            id <= 12 -> 3
            else -> 2
        }

        val colorByVehicle = mutableMapOf<Int, TransitColor>()
        val queue = mutableListOf<TransitColor>()
        val palette = TransitColor.ordered

        layout.solution.chunked(2).forEachIndexed { pairIndex, pair ->
            val colorA = palette[(id + pairIndex * 2) % palette.size]
            if (pair.size == 1) {
                colorByVehicle[pair[0]] = colorA
                repeat(3) { queue += colorA }
            } else {
                var colorB = palette[(id + pairIndex * 2 + 1) % palette.size]
                if (colorB == colorA) colorB = palette[(colorB.ordinal + 1) % palette.size]
                colorByVehicle[pair[0]] = colorA
                colorByVehicle[pair[1]] = colorB

                // Intentional two-bay pattern:
                // first bus takes 2 riders and waits; second fills; first then finishes.
                queue += colorA
                queue += colorA
                repeat(3) { queue += colorB }
                queue += colorA
            }
        }

        val vehicles = layout.seeds.map { raw ->
            val rotated = rotate(raw, layout.width, layout.height, turns)
            VehicleSeed(
                id = raw.id,
                x = rotated.x,
                y = rotated.y,
                direction = rotated.direction,
                color = colorByVehicle.getValue(raw.id),
                capacity = 3
            )
        }

        return LevelDefinition(
            id = id,
            title = names[id - 1],
            width = layout.width,
            height = layout.height,
            bayCount = bayCount,
            vehicles = vehicles,
            passengerQueue = queue,
            solutionOrder = layout.solution
        )
    }

    private fun rotate(seed: RawSeed, width: Int, height: Int, turns: Int): RawSeed {
        var x = seed.x
        var y = seed.y
        var w = width
        var h = height
        repeat(turns) {
            val nextX = h - 1 - y
            val nextY = x
            x = nextX
            y = nextY
            val oldW = w
            w = h
            h = oldW
        }
        return seed.copy(x = x, y = y, direction = seed.direction.rotate(turns))
    }
}
