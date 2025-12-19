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
}

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
          
          const formattedCities: BrazilianCity[] = data.map((m) => ({
            city: m.nome,
            state: m.microrregiao.mesorregiao.UF.nome,
            stateCode: m.microrregiao.mesorregiao.UF.sigla,
            country: 'Brasil',
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
    
    return cities
      .filter((c) => {
        const normalizedCity = c.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const normalizedState = c.stateCode.toLowerCase();
        return normalizedCity.startsWith(normalizedQuery) || 
               normalizedCity.includes(normalizedQuery) ||
               `${normalizedCity}, ${normalizedState}`.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aCity = a.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bCity = b.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Prioritize cities that start with the query
        const aStarts = aCity.startsWith(normalizedQuery);
        const bStarts = bCity.startsWith(normalizedQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return aCity.localeCompare(bCity);
      })
      .slice(0, 20);
  };

  return { cities, loading, error, searchCities };
}
