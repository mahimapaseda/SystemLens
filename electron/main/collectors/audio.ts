import si from 'systeminformation'

export interface AudioInfo {
  devices: {
    name: string
    type: 'Speaker' | 'Microphone' | 'Headphone' | 'USB Audio' | 'Bluetooth' | 'Other'
    status: 'active' | 'inactive' | 'disabled'
    isDefault: boolean
    manufacturer: string
    driver: string
  }[]
  audioScore: number
}

export async function getAudioInfo(): Promise<AudioInfo> {
  const siAudio = await si.audio()

  const devices = siAudio.map((dev) => {
    let type: AudioInfo['devices'][0]['type'] = 'Other'
    const nameLower = (dev.name || '').toLowerCase()

    if (nameLower.includes('speaker') || nameLower.includes('internal')) {
      type = 'Speaker'
    } else if (nameLower.includes('microphone') || nameLower.includes('mic')) {
      type = 'Microphone'
    } else if (nameLower.includes('headphone') || nameLower.includes('headset')) {
      type = 'Headphone'
    } else if (nameLower.includes('usb')) {
      type = 'USB Audio'
    } else if (nameLower.includes('bluetooth') || nameLower.includes('bt')) {
      type = 'Bluetooth'
    }

    return {
      name: dev.name || 'Unknown Audio Device',
      type,
      status: ['active', 'enabled', 'ok'].includes((dev.status || '').toLowerCase()) ? 'active' : 'inactive',
      isDefault: dev.default ?? false,
      manufacturer: dev.manufacturer || 'Unknown',
      driver: dev.driver || 'Unknown'
    }
  })

  const activeCount = devices.filter((d) => d.status === 'active').length
  const audioScore = devices.length === 0 ? 50 : activeCount > 0 ? 90 : 60

  return { devices, audioScore }
}
