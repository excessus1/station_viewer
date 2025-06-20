import type { SensorReading, PhysicalGroup, LogicalGroup } from "@/types/station"

export function parseSensorId(id: string) {
  const parts = id.split("_")
  const [locationNickname = "", stationLocation = "", controllerName = "", sensorTypeParsed = "", ...rest] = parts
  const enumeratorOrName = rest.join("_")
  return { locationNickname, stationLocation, controllerName, sensorTypeParsed, enumeratorOrName }
}

export function groupSensorsPhysically(sensors: SensorReading[]): PhysicalGroup {
  const grouped: PhysicalGroup = {}

  sensors.forEach((sensor) => {
    if (!grouped[sensor.station]) {
      grouped[sensor.station] = {}
    }
    if (!grouped[sensor.station][sensor.controller]) {
      grouped[sensor.station][sensor.controller] = []
    }
    grouped[sensor.station][sensor.controller].push(sensor)
  })

  return grouped
}

export function groupSensorsLogically(sensors: SensorReading[]): LogicalGroup {
  const grouped: LogicalGroup = {}

  sensors.forEach((sensor) => {
    if (!grouped[sensor.sensor_type]) {
      grouped[sensor.sensor_type] = []
    }
    grouped[sensor.sensor_type].push(sensor)
  })

  return grouped
}

export function isDataFresh(timestamp: Date, maxAgeMinutes = 5): boolean {
  const now = new Date()
  const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60)
  return diffMinutes <= maxAgeMinutes
}

const iconMap: { [key: string]: string } = {
  "water-flow": "🌊",
  pressure: "📊",
  "valve-state": "🔄",
  default: "📡",
}

const labelMap: { [key: string]: string } = {
  "water-flow": "Water Flow Sensors",
  pressure: "Pressure Sensors",
  "valve-state": "Valve State",
}

export function getSensorTypeIcon(sensorType: string): string {
  return iconMap[sensorType] || iconMap.default
}

export function getSensorTypeLabel(sensorType: string): string {
  return labelMap[sensorType] || sensorType
}
