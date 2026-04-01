
-- Function to find which region contains a given point (ray casting algorithm in SQL)
CREATE OR REPLACE FUNCTION public.find_region_for_point(_lat double precision, _lng double precision)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _region_id uuid;
  _region record;
  _coords jsonb;
  _ring jsonb;
  _n integer;
  _i integer;
  _j integer;
  _inside boolean;
  _xi double precision;
  _yi double precision;
  _xj double precision;
  _yj double precision;
BEGIN
  FOR _region IN 
    SELECT id, geometry FROM public.regions 
    WHERE geometry IS NOT NULL AND is_active = true
  LOOP
    -- Support GeoJSON Polygon type
    IF _region.geometry->>'type' = 'Polygon' THEN
      _ring := _region.geometry->'coordinates'->0;
      _n := jsonb_array_length(_ring);
      _inside := false;
      _j := _n - 1;
      
      FOR _i IN 0..(_n - 1) LOOP
        _xi := (_ring->_i->>0)::double precision; -- longitude
        _yi := (_ring->_i->>1)::double precision; -- latitude
        _xj := (_ring->_j->>0)::double precision;
        _yj := (_ring->_j->>1)::double precision;
        
        IF ((_yi > _lat) != (_yj > _lat)) AND
           (_lng < (_xj - _xi) * (_lat - _yi) / (_yj - _yi) + _xi) THEN
          _inside := NOT _inside;
        END IF;
        
        _j := _i;
      END LOOP;
      
      IF _inside THEN
        RETURN _region.id;
      END IF;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$;
