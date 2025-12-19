import { useState, useEffect } from 'react';

interface IBGEMunicipio {
  id: number;
  nome: string;
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string;
        nome: string;
      };
    };
  };
}

export interface BrazilianCity {
  city: string;
  state: string;
  stateCode: string;
  country: string;
  type: 'country' | 'state' | 'city';
}

// Brazilian states
const BRAZILIAN_STATES: BrazilianCity[] = [
  { city: 'Acre', state: 'Acre', stateCode: 'AC', country: 'Brasil', type: 'state' },
  { city: 'Alagoas', state: 'Alagoas', stateCode: 'AL', country: 'Brasil', type: 'state' },
  { city: 'Amapá', state: 'Amapá', stateCode: 'AP', country: 'Brasil', type: 'state' },
  { city: 'Amazonas', state: 'Amazonas', stateCode: 'AM', country: 'Brasil', type: 'state' },
  { city: 'Bahia', state: 'Bahia', stateCode: 'BA', country: 'Brasil', type: 'state' },
  { city: 'Ceará', state: 'Ceará', stateCode: 'CE', country: 'Brasil', type: 'state' },
  { city: 'Distrito Federal', state: 'Distrito Federal', stateCode: 'DF', country: 'Brasil', type: 'state' },
  { city: 'Espírito Santo', state: 'Espírito Santo', stateCode: 'ES', country: 'Brasil', type: 'state' },
  { city: 'Goiás', state: 'Goiás', stateCode: 'GO', country: 'Brasil', type: 'state' },
  { city: 'Maranhão', state: 'Maranhão', stateCode: 'MA', country: 'Brasil', type: 'state' },
  { city: 'Mato Grosso', state: 'Mato Grosso', stateCode: 'MT', country: 'Brasil', type: 'state' },
  { city: 'Mato Grosso do Sul', state: 'Mato Grosso do Sul', stateCode: 'MS', country: 'Brasil', type: 'state' },
  { city: 'Minas Gerais', state: 'Minas Gerais', stateCode: 'MG', country: 'Brasil', type: 'state' },
  { city: 'Pará', state: 'Pará', stateCode: 'PA', country: 'Brasil', type: 'state' },
  { city: 'Paraíba', state: 'Paraíba', stateCode: 'PB', country: 'Brasil', type: 'state' },
  { city: 'Paraná', state: 'Paraná', stateCode: 'PR', country: 'Brasil', type: 'state' },
  { city: 'Pernambuco', state: 'Pernambuco', stateCode: 'PE', country: 'Brasil', type: 'state' },
  { city: 'Piauí', state: 'Piauí', stateCode: 'PI', country: 'Brasil', type: 'state' },
  { city: 'Rio de Janeiro', state: 'Rio de Janeiro', stateCode: 'RJ', country: 'Brasil', type: 'state' },
  { city: 'Rio Grande do Norte', state: 'Rio Grande do Norte', stateCode: 'RN', country: 'Brasil', type: 'state' },
  { city: 'Rio Grande do Sul', state: 'Rio Grande do Sul', stateCode: 'RS', country: 'Brasil', type: 'state' },
  { city: 'Rondônia', state: 'Rondônia', stateCode: 'RO', country: 'Brasil', type: 'state' },
  { city: 'Roraima', state: 'Roraima', stateCode: 'RR', country: 'Brasil', type: 'state' },
  { city: 'Santa Catarina', state: 'Santa Catarina', stateCode: 'SC', country: 'Brasil', type: 'state' },
  { city: 'São Paulo', state: 'São Paulo', stateCode: 'SP', country: 'Brasil', type: 'state' },
  { city: 'Sergipe', state: 'Sergipe', stateCode: 'SE', country: 'Brasil', type: 'state' },
  { city: 'Tocantins', state: 'Tocantins', stateCode: 'TO', country: 'Brasil', type: 'state' },
];

const BRAZIL_COUNTRY: BrazilianCity = {
  city: 'Brasil',
  state: '',
  stateCode: '',
  country: 'Brasil',
  type: 'country'
};

let cachedCities: BrazilianCity[] | null = null;
let fetchPromise: Promise<BrazilianCity[]> | null = null;

export function useBrazilianCities() {
  const [cities, setCities] = useState<BrazilianCity[]>(cachedCities || []);
  const [loading, setLoading] = useState(!cachedCities);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCities() {
      if (cachedCities) {
        setCities(cachedCities);
        setLoading(false);
        return;
      }

      if (fetchPromise) {
        const result = await fetchPromise;
        setCities(result);
        setLoading(false);
        return;
      }

      fetchPromise = (async () => {
        try {
          const response = await fetch(
            'https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome'
          );
          
          if (!response.ok) {
            throw new Error('Falha ao carregar municípios');
          }

          const data: IBGEMunicipio[] = await response.json();
          
          const formattedCities: BrazilianCity[] = data
            .filter((m) => m.microrregiao?.mesorregiao?.UF)
            .map((m) => ({
              city: m.nome,
              state: m.microrregiao.mesorregiao.UF.nome,
              stateCode: m.microrregiao.mesorregiao.UF.sigla,
              country: 'Brasil',
              type: 'city' as const,
            }));

          cachedCities = formattedCities;
          return formattedCities;
        } catch (err) {
          throw err;
        }
      })();

      try {
        const result = await fetchPromise;
        setCities(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    fetchCities();
  }, []);

  const searchCities = (query: string): BrazilianCity[] => {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Check if searching for Brazil
    const brazilMatch = 'brasil'.startsWith(normalizedQuery) || normalizedQuery === 'brasil';
    
    // Search states
    const matchingStates = BRAZILIAN_STATES.filter((s) => {
      const normalizedState = s.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedCode = s.stateCode.toLowerCase();
      return normalizedState.includes(normalizedQuery) || normalizedCode === normalizedQuery;
    }).sort((a, b) => {
      const aState = a.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bState = b.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const aStarts = aState.startsWith(normalizedQuery);
      const bStarts = bState.startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return aState.localeCompare(bState);
    });
    
    // Search cities
    const matchingCities = cities
      .filter((c) => {
        const normalizedCity = c.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedState = c.stateCode.toLowerCase();
        return normalizedCity.includes(normalizedQuery) ||
               `${normalizedCity}, ${normalizedState}`.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aCity = a.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bCity = b.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const aStarts = aCity.startsWith(normalizedQuery);
        const bStarts = bCity.startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aCity.localeCompare(bCity);
      })
      .slice(0, 15);
    
    // Combine results: country first, then states, then cities
    const results: BrazilianCity[] = [];
    
    if (brazilMatch) {
      results.push(BRAZIL_COUNTRY);
    }
    
    results.push(...matchingStates);
    results.push(...matchingCities);
    
    return results.slice(0, 20);
  };

  return { cities, loading, error, searchCities };
}
