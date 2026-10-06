import { Text, View } from 'react-native';
import { Button, Card, Disclosure, s, ValueRow } from './ui';

const benefits = [
  { title: 'Análisis avanzado', description: 'Estadísticas completas, tendencias de riesgo y análisis detallado de tus recorridos.' },
  { title: 'Detección avanzada', description: 'Evaluación más detallada de señales de posibles accidentes, con reglas explicables.' },
  { title: 'Alertas y contactos', description: 'Notificaciones importantes y contactos de emergencia para compartir alertas.' },
  { title: 'Historial y reportes', description: 'Historial completo y reportes para consultar la evolución de tus viajes.' },
];

export function Premium() {
  return <>
    <View style={s.pageHeading}>
      <Text style={s.eyebrow}>RoadGuard Premium</Text>
      <Text style={s.hero}>Más sobre tus viajes</Text>
      <Text style={s.description}>Conoce el plan para llevar el seguimiento de tus recorridos un paso más allá.</Text>
    </View>
    <Card>
      <View style={s.row}><Text style={s.title}>Plan mensual</Text><Text style={s.badge}>Próximamente</Text></View>
      <Text style={s.premiumPrice}>$49.99<Text style={s.premiumCurrency}> MXN / mes</Text></Text>
      <Text style={s.muted}>Precio de referencia para la suscripción mensual.</Text>
      <Button title="Suscripción próximamente" disabled onPress={() => {}} />
      <Text style={s.footnote}>El plan está en preparación. No se realizará ningún cobro en esta versión.</Text>
    </Card>
    <View style={s.stacked}>
      <Text style={s.title}>El plan incluirá</Text>
      {benefits.map((benefit, index) => <View key={benefit.title} style={s.premiumBenefit}>
        <Text style={s.premiumNumber}>{String(index + 1).padStart(2, '0')}</Text>
        <View style={{ flex: 1, gap: 5 }}><Text style={s.body}>{benefit.title}</Text><Text style={s.description}>{benefit.description}</Text></View>
      </View>)}
    </View>
    <Disclosure title="Tu plan actual">
      <ValueRow label="Plan gratuito" value="Activo" />
      <Text style={s.description}>Sensores en tiempo real, índice de riesgo, eventos y resumen de tus viajes con historial local.</Text>
    </Disclosure>
    <Disclosure title="Sobre la suscripción">
      <Text style={s.description}>Premium todavía no está disponible para contratar. Los beneficios se habilitarán cuando estén listos y el pago esté integrado.</Text>
      <Text style={s.footnote}>Esta pantalla permite conocer el plan. No activa funciones ni solicita datos de pago.</Text>
    </Disclosure>
  </>;
}
