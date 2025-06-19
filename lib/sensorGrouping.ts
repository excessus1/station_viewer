import type { SensorReading, PhysicalGroup, LogicalGroup } from "@/types/station"

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

export function getSensorTypeIcon(sensorType: string): string {
  const iconMap: { [key: string]: string } = {
    temperature: "🌡️",
    humidity: "💧",
    pressure: "📊",
    virtualState: "🔄",
    flow: "🌊",
    level: "📏",
    ph: "⚗️",
    conductivity: "⚡",
    default: "📡",
  }

  return iconMap[sensorType] || iconMap.default
}
