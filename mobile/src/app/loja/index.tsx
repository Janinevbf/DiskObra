import { Redirect } from 'expo-router';

export default function LojaIndex() {
  return <Redirect href={'/loja/estoque' as any} />;
}
