"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { SensorReading } from "@/types/station"
import { mqttClient } from "@/lib/mqttClient"
import { groupSensorsPhysically, groupSensorsLogically, isDataFresh, getSensorTypeIcon } from "@/lib/sensorGrouping"
import { Activity, Wifi, WifiOff, Clock } from "lucide-react"

export default function StationViewer() {
  const [sensors, setSensors] = useState<SensorReading[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [manualTopic, setManualTopic] = useState("")
  const [manualMessage, setManualMessage] = useState("")

  useEffect(() => {
    const unsubscribe = mqttClient.subscribe((reading: SensorReading) => {
      setSensors((prev) => {
        // Remove old reading for the same sensor_id and add new one
        const filtered = prev.filter((s) => s.sensor_id !== reading.sensor_id)
        return [...filtered, reading].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      })
    })

    // Check connection status periodically
    const connectionCheck = setInterval(() => {
      setIsConnected(mqttClient.getConnectionStatus())
    }, 1000)

    return () => {
      unsubscribe()
      clearInterval(connectionCheck)
    }
  }, [])

  const physicalGroups = groupSensorsPhysically(sensors)
  const logicalGroups = groupSensorsLogically(sensors)

  const handleManualCommand = () => {
    if (manualTopic && manualMessage) {
      mqttClient.publish(manualTopic, manualMessage)
      setManualTopic("")
      setManualMessage("")
    }
  }

  const SensorCard = ({ sensor }: { sensor: SensorReading }) => {
    const isFresh = isDataFresh(sensor.timestamp)
    const icon = getSensorTypeIcon(sensor.sensor_type)

    return (
      <Card
        className={`transition-all duration-300 ${isFresh ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50 opacity-75"}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              {sensor.enumeratorOrName || sensor.sensor_type}
            </CardTitle>
            <Badge variant={isFresh ? "default" : "secondary"} className="text-xs">
              {sensor.sensor_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">{sensor.value}</span>
              <span className="text-sm text-muted-foreground">{sensor.unit}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {sensor.timestamp.toLocaleTimeString()}
              </div>
              <div>Station: {sensor.station}</div>
              <div>Controller: {sensor.controller.split("_").pop()}</div>
              {sensor.pin !== -1 && <div>Pin: {sensor.pin}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">ControlCore Station Viewer</h1>
          <p className="text-muted-foreground">Real-time sensor monitoring and control</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="default" className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive" className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Disconnected
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {sensors.length} sensors
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="physical" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="physical">Physical View</TabsTrigger>
          <TabsTrigger value="logical">Logical View</TabsTrigger>
          <TabsTrigger value="manual">Manual Overrides</TabsTrigger>
        </TabsList>

        <TabsContent value="physical" className="space-y-6">
          <div className="space-y-6">
            {Object.entries(physicalGroups).map(([station, controllers]) => (
              <Card key={station}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">🏭 Station: {station}</CardTitle>
                  <CardDescription>{Object.keys(controllers).length} controller(s)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(controllers).map(([controller, sensorList]) => (
                    <div key={controller} className="space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        🎛️ Controller: {controller.split("_").pop()}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {sensorList.map((sensor) => (
                          <SensorCard key={sensor.sensor_id} sensor={sensor} />
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
          {Object.keys(physicalGroups).length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="text-4xl">📡</div>
                  <p className="text-muted-foreground">No sensor data received yet</p>
                  <p className="text-sm text-muted-foreground">Waiting for MQTT messages on controlcore/#</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logical" className="space-y-6">
          <div className="space-y-6">
            {Object.entries(logicalGroups).map(([sensorType, sensorList]) => (
              <Card key={sensorType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span className="text-xl">{getSensorTypeIcon(sensorType)}</span>
                    {sensorType} Sensors
                  </CardTitle>
                  <CardDescription>{sensorList.length} sensor(s) of this type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sensorList.map((sensor) => (
                      <SensorCard key={sensor.sensor_id} sensor={sensor} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {Object.keys(logicalGroups).length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="text-4xl">🔍</div>
                  <p className="text-muted-foreground">No sensor types detected yet</p>
                  <p className="text-sm text-muted-foreground">Sensors will be grouped by type as data arrives</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Manual MQTT Commands</CardTitle>
              <CardDescription>
                Send direct MQTT commands to control devices. Use the sensor_id format for targeted control.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">MQTT Topic</Label>
                  <Input
                    id="topic"
                    placeholder="controlcore/command/sensor_id"
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder='{"command": "set_value", "value": 1}'
                    value={manualMessage}
                    onChange={(e) => setManualMessage(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <Button
                onClick={handleManualCommand}
                disabled={!manualTopic || !manualMessage || !isConnected}
                className="w-full"
              >
                Send Command
              </Button>

              <div className="mt-6 space-y-2">
                <h4 className="font-medium">Recent Sensor IDs (for reference):</h4>
                <div className="bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
                  {sensors.slice(0, 10).map((sensor) => (
                    <div key={sensor.sensor_id} className="text-sm font-mono text-muted-foreground">
                      {sensor.sensor_id}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
